/**
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 */
define(['N/record','N/runtime','N/https'], function(record, runtime,https) {
    function onAction(scriptContext){


    var myScript = runtime.getCurrentScript();
    const FORMSTACK_URL = myScript.getParameter('custscript_addr_formstack_url'); 
    const PRINTNODE_KEY = myScript.getParameter('custscript_addr_printnode_key'); 
    const PRINTNODE_URL = myScript.getParameter('custscript_addr_printnode_url'); 
    const PRINTNODE_PRINTER = myScript.getParameter('custscript_addr_printnode_printer');

    const custRecord = scriptContext.newRecord;

    var customer = record.load({
        type: record.Type.CUSTOMER,
        id : custRecord.id,
        isDynamic: false
    });

    var address_count = customer.getLineCount('addressbook');
    var billing_address = null;


    for (var i = 0; i < address_count; i++){
    var def_Bill = customer.getSublistValue('addressbook', 'defaultbilling', i);

        if(def_Bill){
        var billing_address = customer.getSublistSubrecord('addressbook', 'addressbookaddress', i);
        }
    }


    var title = customer.getValue({
        fieldId: 'salutation'
    })
    var firstName = customer.getValue({
        fieldId: 'firstname'
    })
    var lastName = customer.getValue({
        fieldId: 'lastname'
    })
    var addr1 = billing_address.getValue({
        fieldId: 'addr1'
    })
    var addr2 = billing_address.getValue({
        fieldId: 'addr2'
    })
     var addr3 = billing_address.getValue({
        fieldId: 'addr3'
    })
    var city = billing_address.getValue({
        fieldId: 'city'
    })
    var county = billing_address.getValue({
        fieldId: 'state'
    })
    var postcode = billing_address.getValue({
        fieldId: 'zip'
    })
    var country = billing_address.getValue({
        fieldId: 'country'
    })
    
    var countryURL = 'https://restcountries.com/v3.1/alpha/' + country + '?fields=name'

    var countryheaderObj = {
        "content-type" : "application/json",
        "accept" : "application/json"
    };
    var countryResponse = https.get({
        url: countryURL,
      headers: countryheaderObj,
       });

    var countryBody = JSON.parse(countryResponse.body)

    var countryName =  countryBody.name.common;

    var parameters = 'title='+title+'&firstName='+firstName+'&lastName='+lastName+'&addr1='+addr1+'&addr2='+addr2+'&addr3='+addr3+'&county='+county+'&postcode='+postcode+'&country='+countryName;

    log.debug ("params", parameters)

            //build and send call to Formstack
                var headerObj = {
                    "content-type" : "application/x-www-form-urlencoded"
                };
                var formstackResponse = https.post({
                    url: FORMSTACK_URL,
                    headers: headerObj,
                    body: parameters
                });

            //store response in variable

                var labelBase64 = formstackResponse.body;

                log.audit("MAP Formstack Response",formstackResponse.code);


            //build and send call containing PDF to PrintNode

                 var printParameters = {
                        "printerId" : PRINTNODE_PRINTER,
                        "title" : "Address label print",
                        "contentType" : "pdf_base64",
                        "content" : labelBase64,
                        "source" : "Netsuite label printing script",
                };

                var printHeaderObj = {
                    "Authorization" : "Basic " + PRINTNODE_KEY
                };     

                log.debug("MAP print headers", printHeaderObj);
                log.debug("MAP print body", printParameters);

                var printnodeResponse = https.post({

                    url: PRINTNODE_URL,
                    headers: printHeaderObj,
                    body: printParameters

                });
 
    }
    return {
        onAction: onAction
    }
}); 