/**
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 */
define(['N/record','N/runtime','N/task','./moment.js', 'N/https'], function(record, runtime,task, moment, https) {
function onAction(scriptContext){


//Set variables based on script parameters

var myScript = runtime.getCurrentScript();
const ORDER_ID = myScript.getParameter('custscript_ammend_orderid');
const ADYEN_KEY = myScript.getParameter('custscript_ammend_adyenkey');
const ADYEN_MERCHANT = 'PostscriptBooksLimitedMOTO'
//const ADYEN_MERCHANT = myScript.getParameter('custscript_ammend_adyenmarchant');
const ADYEN_URL = 'https://pal-test.adyen.com/pal/servlet/Payment/v68/cancel'


try {


    log.audit("Opening Sales Order " + ORDER_ID)

    var salesorderRecord = record.load({
    type: record.Type.SALES_ORDER, 
    id: ORDER_ID, 
    isDynamic: false,
    });


    var paymentEvents = salesorderRecord.getLineCount({
        sublistId: 'paymentevent'
    })

    log.audit("Order has " + paymentEvents + " payment events")

    var eventsArray = new Array();

    for (var i = 0; i<paymentEvents; i++){
        log.debug("Line " + i )
        var tempObj = {};
        tempObj["operationtype"] = salesorderRecord.getSublistValue({sublistId: 'paymentevent', fieldId: 'type', line: i});
        tempObj["status"]= salesorderRecord.getSublistValue({sublistId: 'paymentevent', fieldId: 'result', line: i});
        tempObj["ref"] = salesorderRecord.getSublistValue({sublistId: 'paymentevent', fieldId: 'pnrefnum', line: i});
        tempObj["date"] = salesorderRecord.getSublistValue({sublistId: 'paymentevent', fieldId: 'eventdate', line: i});
        eventsArray.push(tempObj);
    }

    log.debug("Payment Events", eventsArray)

    var authArray = new Array();

    for (var x = 0; x<eventsArray.length; x++){
        if (eventsArray[x].operationtype=='Authorization' && eventsArray[x].status=='Accept'){
            authArray.push(eventsArray[x])
        }
    }

    var captureArray = new Array();

    for (var y = 0; y<eventsArray.length; y++){
        if (eventsArray[y].operationtype=='Capture Authorization'){
            captureArray.push(eventsArray[y])
        }
    }

    var sortedAuthEvents = authArray.sort(
          function(a, b) {
                if (a.date == b.date) return 0;
                return a.date > b.date ? 1 : -1;
          }
    );

  
    log.debug("Oldest Auth Event", sortedAuthEvents[0].ref)

    if(authArray.length>1 && captureArray.length==0){

        log.audit ("Order has multiple auths and no captures, proceeding")

        var adyenHeader = {
        "content-type": "application/json",
        "X-API-Key": ADYEN_KEY
        };

        var adyenBody = {
        "originalReference": sortedAuthEvents[0].ref,
        "reference": "AUTO"+ ORDER_ID,
        "merchantAccount": ADYEN_MERCHANT
        };

        log.debug("Adyen Header", adyenHeader);
        log.debug("Adyen Body", adyenBody);

        var adyenResponse = https.post({
            url: ADYEN_URL,
            headers: adyenHeader,
            body: JSON.stringify(adyenBody)
        });

        log.debug("Adyen Response Body",adyenResponse.body);

        if (adyenResponse.code == 200){
            return adyenResponse.body
        }

        else{

            return "ADYENFAILED"
        }

    }

    else{

        log.audit ("Order has " + authArray.length + " auths and " + captureArray.length + " captures, cannot proceed")
        return "FAILED"
    }



 }
     
        catch (e) {
            log.audit("ERROR : " + e.name, e.message);
        }
    }


    return {
        onAction: onAction
    }
}); 

