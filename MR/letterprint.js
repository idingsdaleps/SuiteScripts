/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */


// PSBooks Letter printer. Processes sales order records with letter attribute set in order to auto generate and print document

define(['N/search', 'N/runtime', 'N/https','N/record','N/file','N/currentRecord','./moment.js','N/crypto/random'],
function (search, runtime, https, record, file, currentRecord, moment, random) {

    var scriptObj = runtime.getCurrentScript();
    const SAVED_SEARCH_ID = scriptObj.getParameter('custscript_letter_saved_search'); 
    const FORMSTACK_URL = scriptObj.getParameter('custscript_letter_formstack_url'); 
    const PRINTNODE_KEY = scriptObj.getParameter('custscript_letter_printnode_key'); 
    const PRINTNODE_URL = scriptObj.getParameter('custscript_letter_printnode_url'); 
    const PRINTNODE_PRINTER = scriptObj.getParameter('custscript_letter_printnode_printer');

//Get input from saved search and push values into array

    function getInputData() {
        try {
            log.audit("GET INPUT", "**SCRIPT START**");
            var returnArray = new Array();
            var requestSearchObj = search.load({
                id: SAVED_SEARCH_ID
            });
            var searchResultCount = requestSearchObj.runPaged().count;
            requestSearchObj.run().each(function (result) {
            var tempObj = {};
                tempObj["orderID"] = result.id;
                tempObj["title"] = result.getValue({name: 'salutation', join: "customer"});
                tempObj["firstName"] = result.getValue({name: 'firstName', join: "customer"});
                tempObj["lastName"] = result.getValue({name: 'lastName', join: "customer"});
                tempObj["addr1"] = result.getValue({name: 'address1', join: "billingaddress"});
                tempObj["addr2"] = result.getValue({name: 'address2', join: "billingaddress"});
                tempObj["addr3"] = result.getValue({name: 'city', join: "billingaddress"});
                tempObj["county"] = result.getValue({name: 'state', join: "billingaddress"});
                tempObj["postcode"] = result.getValue({name: 'zip', join: "billingaddress"});
                tempObj["custID"] = result.getValue({name: 'externalid', join: "customer"});
                tempObj["custIntID"] = result.getValue({name: 'internalid', join: "customer"});
                tempObj["letterRef"] = result.getValue({name: "custbody_ps_letter_to_print"});
                tempObj["orderTotal"] = result.getValue({name: "amount"});
                tempObj["orderDate"]  = result.getValue({name: "datecreated"});
                tempObj["letterDate"]  = result.getValue({name: "formuladate"});

                returnArray.push(tempObj);
                return true;
                    });

            return returnArray;
        }
        catch (e) {
            log.error("GET INPUT ERROR : " + e.name, e.message);
        }
    }


//Process each request

    function map(context) {
        try {
            var requestObj = JSON.parse(context.value);

            log.debug("MAP requestObj",requestObj);
            
            //Set variables for current request

            var title = requestObj.title;
            var firstName = requestObj.firstName;
            var lastName = requestObj.lastName;
            var addr1 = requestObj.addr1;
            var addr2 = requestObj.addr2;
            var addr3 = requestObj.addr3;
            var county = requestObj.county;
            var postcode = requestObj.postcode;
            var custID = requestObj.custID
            var custIntID = requestObj.custIntID;
            var letterRef = requestObj.letterRef;
            var letterDate = requestObj.letterDate;
            var orderID = requestObj.orderID;

            //build parameters for Formstack call
            var parameters = 'title='+title+'&firstName='+firstName+'&lastName='+lastName+'&addr1='+addr1+'&addr2='+addr2+'&addr3='+addr3+'&county='+county+'&postcode='+postcode+'&custID='+custID+'&letterDate='+letterDate;

            log.audit("MAP Processing", "Creating payload for customer " + custID + "-" + firstName + " " + lastName);
            log.debug("MAP parameters", parameters);


            //build and send call to Formstack
                var headerObj = {
                    "content-type" : "application/x-www-form-urlencoded"
                };
                var formstackResponse = https.post({
                    url: FORMSTACK_URL + "/" + letterRef,
                    headers: headerObj,
                    body: parameters
                }); 

            //store response in variable

                var labelBase64 = formstackResponse.body;

                log.audit("MAP Formstack Response",formstackResponse.code);


            //build and send call containing PDF to PrintNode

                 var printParameters = {
                        "printerId" : PRINTNODE_PRINTER,
                        "title" : "Letter print",
                        "contentType" : "pdf_base64",
                        "content" : labelBase64,
                        "source" : "Netsuite letter processing script",
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

                log.audit("MAP PrintNode Response",printnodeResponse.code);


                //Save resulting file to file cabinet

               var fileSuffix = random.generateInd({min:100, max:999});

               var letterFile = file.create({

                    name: custID + '-' + letterDate + '-' + fileSuffix + '.pdf',
                    fileType: file.Type.PDF,
                    contents: labelBase64

                });

                letterFile.folder = 1633054;

                var fileID = letterFile.save();

                log.audit("MAP saved file",fileID);

                var attachID = record.attach({
                    record: {
                        type: 'file',
                        id: fileID
                    },
                    to: {
                        type: 'customer',
                        id: custIntID
                    }
                });

                log.audit("MAP file attached",attachID);

                //if letter prints OK, clear request flag

                log.debug("PN Response Code",printnodeResponse.code);

                if(printnodeResponse.code===201){
                    record.submitFields({
                        type: 'salesorder',
                        id: orderID,
                        values: {
                            'custbody_ps_letter_to_print': "complete"
                        }
                    });

                log.audit("MAP Transaction Updated","Print field cleared");




                
            }}

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