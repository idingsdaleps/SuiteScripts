/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */


// PSBooks Customer Postcodes Processor. Sets customer attributes for postcodes to make them searchable in global search


define(['N/search', 'N/runtime', 'N/https','N/record','N/file','N/currentRecord'],
function (search, runtime, https, record, file, currentRecord) {

    var scriptObj = runtime.getCurrentScript();
    const SAVED_SEARCH_ID = scriptObj.getParameter('custscript_postcode_search'); 


//Get input from saved search and push values into array

    function getInputData() {
        try {
            log.audit("GET INPUT", "**SCRIPT START**");
            var returnArray = new Array();
            var requestSearchObj = search.load({
                id: SAVED_SEARCH_ID
            });

            const pagedData = requestSearchObj.runPaged({
              pageSize: 1000
            });

            pagedData.pageRanges.forEach(function (pageRange) {
              const page = pagedData.fetch({ index: pageRange.index });
              page.data.forEach(function (result) {
                var tempObj = {};
                tempObj["custID"] = result.getValue("internalid");
                tempObj["shipPostcode"] = result.getValue({
                    name: "zipcode",
                    join: "shippingAddress"
                });
                tempObj["billingPostcode"] = result.getValue({
                    name: "zipcode",
                    join: "billingAddress"
                });
                returnArray.push(tempObj);
                return true;

                    });
               });

            return returnArray;
        }
        catch (e) {
            log.error("GET INPUT ERROR : " + e.name, e.message);
        }
    }


 function map(context) {

try{

            var requestObj = JSON.parse(context.value);
            log.debug("MAP requestObj",requestObj);

            
            //Set variables for current request

            var custID = requestObj.custID;
            var shipPostcode = requestObj.shipPostcode.replace(" ", "");
            var billingPostcode = requestObj.billingPostcode.replace(" ", "");;

            log.audit("Processing", "Customer ID " + custID + " with postcodes " + shipPostcode + " " + billingPostcode)

            var current_customer = record.load({
            type: record.Type.CUSTOMER,
            id : custID,
            isDynamic: false
            });

            current_customer.setValue({
            fieldId: 'custentity_ps_default_billing_postcode',
            value: billingPostcode
            });

            current_customer.setValue({
            fieldId: 'custentity_ps_default_shipping_postcode',
            value: shipPostcode
            });


            try {
                var recId = current_customer.save();
                log.debug({
                    title: 'Customer successfully saved',
                    details: 'Id: ' + recId
                });
            } catch (e) {
                log.error({
                    title: e.name,
                    details: e.message      
                });
             }

        
}

    catch (e) {
            log.debug("MAP ERROR : " + e.name, e.message);

        }
    }

    function summarize(context) {
        log.debug("SUMMARIZE", "**SCRIPT END**");
    }

    return {
        getInputData: getInputData,
        map: map,
        summarize: summarize
    };
});