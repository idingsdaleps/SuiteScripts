/**
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 */
define(['N/record','N/runtime','N/task','./moment.js', 'N/https'], function(record, runtime,task, moment, https) {
function onAction(scriptContext){

var myScript = runtime.getCurrentScript();
const CUSTOMER_EMAIL = myScript.getParameter('custscript_ticket_email');
const CUSTOMER_ID = myScript.getParameter('custscript_ticket_custid'); 
const CUSTOMER_NAME = myScript.getParameter('custscript_ticket_custname'); 
const TICKET_BODY = myScript.getParameter('custscript_ticket_body'); 
const TICKET_SUBJECT = myScript.getParameter('custscript_ticket_subject'); 
const ZENDESK_URL = myScript.getParameter('custscript_ticket_zdURL'); 
const ZENDESK_KEY = myScript.getParameter('custscript_ticket_zdKey'); 

try {

                var zendeskHeaderObj = {
                    "content-type": "application/json",
                    "Authorization" : "Basic " + ZENDESK_KEY
                };     


               log.debug ("Search by ID", "Looking for ID " + CUSTOMER_ID)
               var searchByIdCountBody = https.get({
                    url: ZENDESK_URL + "api/v2/search/count?query=type:user ns_externalid:" + CUSTOMER_ID,
                    headers: zendeskHeaderObj,
                });

                var searchByIdCount = JSON.parse(searchByIdCountBody.body).count
                log.debug("Search by ID",  "ID search returned " + searchByIdCount + " results")

                    if(searchByIdCount>0){
                        var searchByIdBody = https.get({
                        url: ZENDESK_URL + "api/v2/users/search?query=ns_externalid:" + CUSTOMER_ID,
                        headers: zendeskHeaderObj,
                    });

                    var zendeskUserId= JSON.parse(searchByIdBody.body).users[0].id
                    log.debug ("Search by ID success", "Creating ticket using ID " + zendeskUserId)

                    } else

                        {

                        if (!CUSTOMER_EMAIL){

                        log.debug("No email", "No email address, creating customer using ID only")
                        var user_json = {"user": {"name": CUSTOMER_NAME,"user_fields": {"ns_externalid": CUSTOMER_ID}}}
                        var createUserResponse = https.post({
                        url: ZENDESK_URL + "api/v2/users/create_or_update",
                        headers: zendeskHeaderObj,
                        body: JSON.stringify(user_json)
                        });
                        if (createUserResponse.code==201){
                        var zendeskUserId = JSON.parse(createUserResponse.body).user.id
                        log.debug("User Created", "User ID " + zendeskUserId+ " Created")
                        } 
                            else{
                            log.debug("User Creation Failed", createUserResponse)
                            log.debug("User JSON", user_json)
                            }

                        }

                        else{

                        log.debug ("Search by ID failed", "No results from ID search, looking for email " + CUSTOMER_EMAIL)
                        var searchByEmailCountBody = https.get({
                        url: ZENDESK_URL + "api/v2/search/count?query=type:user " + CUSTOMER_EMAIL,
                        headers: zendeskHeaderObj,
                        });
                        var searchByEmailCount = JSON.parse(searchByEmailCountBody.body).count
                        log.debug("Search by email",  "Email search returned " + searchByEmailCount + " results")

                        if(searchByEmailCount>0){

                        var searchByEmailBody = https.get({
                        url: ZENDESK_URL + "api/v2/users/search?query=" + CUSTOMER_EMAIL,
                        headers: zendeskHeaderObj,
                        });

                        var zendeskUserId= JSON.parse(searchByEmailBody.body).users[0].id
                        log.debug("Search by email success", "Creating ticket using ID " + zendeskUserId)

                            } 
                            else {
                            log.debug("No results", "No results found for ID or Email, creating new user")
                            var user_json = {"user": {"name": CUSTOMER_NAME,"email": CUSTOMER_EMAIL,"user_fields": {"ns_externalid": CUSTOMER_ID}}}
                            var createUserResponse = https.post({
                            url: ZENDESK_URL + "api/v2/users/create_or_update",
                            headers: zendeskHeaderObj,
                            body: JSON.stringify(user_json)
                            });
                            if (createUserResponse.code==201){
                            var zendeskUserId = JSON.parse(createUserResponse.body).user.id
                            log.debug("User Created", "User ID " + createdUserId + " Created")
                            } 
                                else{
                                log.debug("User Creation Failed", createUserResponse)
                                log.debug("User JSON", user_json)
                                }
                            }

                         }}


            var ticket_json = {"ticket":{"subject": TICKET_SUBJECT,"comment": {"body": TICKET_BODY, "public": false},"requester_id":zendeskUserId}}
            var createTicketResponse = https.post({
            url: ZENDESK_URL + "api/v2/tickets",
            headers: zendeskHeaderObj,
            body: JSON.stringify(ticket_json)
            });
            if (createTicketResponse.code==201){
            var createdTicketId = JSON.parse(createTicketResponse.body).ticket.id
            log.debug("Ticket Created", "Ticket ID " + createdTicketId + " Created")
            return createdTicketId
            } 
            else{
            log.debug("Ticket Creation Failed", createTicketResponse)
            log.debug("Ticket JSON", ticket_json)
            }




 }
     
        catch (e) {
            log.debug("ERROR : " + e.name, e.message);
        }
    }


    return {
        onAction: onAction
    }
}); 
