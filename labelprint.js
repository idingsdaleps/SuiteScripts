/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */


// PSBooks Catalogue requests processor. Saved search to locate customer details with catalogue requested box ticked, this script generates postage labels, adds campaign response and unticks the request box
// Label generation is done by sending API request to Formstack which returns PDF content in response based on configured template. This content is then sent to PrintNode 

define(['N/search', 'N/runtime', 'N/https','N/record','N/file','N/currentRecord','./moment.js'],
function (search, runtime, https, record, file, currentRecord, moment) {

    var scriptObj = runtime.getCurrentScript();
    const SAVED_SEARCH_ID = scriptObj.getParameter('custscript_formstack_search'); 
    const FORMSTACK_URL = scriptObj.getParameter('custscript_formstack_url'); 
    const PRINTNODE_KEY = scriptObj.getParameter('custscript_printnode_key'); 
    const PRINTNODE_URL = scriptObj.getParameter('custscript_printnode_url'); 
    const PRINTNODE_PRINTER = scriptObj.getParameter('custscript_printnode_printer');



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

                tempObj["title"] = result.getValue("salutation");
                tempObj["firstName"] = result.getValue("firstName");
                tempObj["lastName"] = result.getValue("lastName");
                tempObj["addr1"] = result.getValue("billaddress1");
                tempObj["addr2"] = result.getValue("billaddress2");
                tempObj["addr3"] = result.getValue("billaddress3");
                tempObj["county"] = result.getValue("billstate");
                tempObj["postcode"] = result.getValue("billzipcode");
                tempObj["country"] = result.getText("billcountry");
                tempObj["custID"] = result.getValue("internalid");
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
            var country = requestObj.country;
            var custID = requestObj.custID

            //search media code config to get the current campaign lead source

            var configLookUpResult = search.lookupFields({
            type: 'customrecord_nbs330_media_code_config',
            id: 1,
            columns: 'custrecord_nbs330_catdefaultmediacode'
            });

            var defaultMediaCodeId = configLookUpResult['custrecord_nbs330_catdefaultmediacode'][0].value;
            var leadSource = record.load({type: 'campaign', id: defaultMediaCodeId});

            //get default event for lead source

            var defaultEvent = leadSource.getSublistValue({sublistId: 'defaultevent', fieldId: 'id', line: 0});

            log.audit ("MAP Media Code", "Using media code ID " + defaultMediaCodeId + " and event ID " + defaultEvent)

            //build parameters for Formstack call
            var parameters = 'title='+title+'&firstName='+firstName+'&lastName='+lastName+'&addr1='+addr1+'&addr2='+addr2+'&addr3='+addr3+'&county='+county+'&postcode='+postcode+'&country='+country;

            log.audit("MAP Processing", "Creating payload for customer " + custID + "-" + firstName + " " + lastName);
            log.debug("MAP parameters", parameters);


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
                        "options": {"paper":"11354 Multi-Purpose","rotate":"0"},
                        "source" : "Netsuite catalogue request processing script",
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

                //if label prints OK, clear request flag and create campaign response

                if(printnodeResponse.code){
                    record.submitFields({
                        type: 'customer',
                        id: custID,
                        values: {
                            'custentity_nbs_orderacataloguesent': false
                        }
                    });

                log.audit("MAP Customer Updated","Request field cleared");

                var campaignResponse = record.create({
                    type: record.Type.CAMPAIGN_RESPONSE,
                    isDynamic: false
                });

                campaignResponse.setValue({
                    fieldId: 'leadsource',
                    value: defaultMediaCodeId
                });

                campaignResponse.setValue({
                    fieldId: 'entity',
                    value: custID
                });

                campaignResponse.setValue({
                    fieldId: 'campaignevent',
                    value: defaultEvent
                });

                campaignResponse.setValue({
                    fieldId: 'response',
                    value: 'SENT'
                });

                var campaignId = campaignResponse.save({
                   enableSourcing: false,
                   ignoreMandatoryFields: false
                });

                log.audit("MAP Customer Updated","Campaign response saved ID " + campaignId);

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