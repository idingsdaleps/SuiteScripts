/**
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 */
define(['N/record','N/runtime','N/task','./moment.js', 'N/https'], function(record, runtime,task, moment, https) {
function onAction(scriptContext){

var myScript = runtime.getCurrentScript();
const SENDGRID_URL = myScript.getParameter('custscript_catalogue_sendgrid_url');
const SENDGRID_KEY = myScript.getParameter('custscript_catalogue_sendgrid_key'); 
const REQUEST_TYPE = myScript.getParameter('custscript_catalogue_type'); 
const CUSTOMER_NAME = myScript.getParameter('custscript_catalogue_cust_name'); 
//const CUSTOMER_EMAIL = myScript.getParameter('custscript_catalogue_cust_email'); 
const CUSTOMER_EMAIL = 'i.dingsdale@gmail.com'; 



if (CUSTOMER_NAME == 'Magento Guest Checkout'){
    var email_customer_name = 'Customer'
}
else {
    var email_customer_name = CUSTOMER_NAME
}

switch (REQUEST_TYPE){
case 'NEW':
    SENDGRID_TEMPLATE = 'd-20b76004f4e84c53a348d982b04608b2';
    break;
case 'REACTIVATION':    
    SENDGRID_TEMPLATE = 'd-20b76004f4e84c53a348d982b04608b2';
    break;
case 'DUPLICATE':    
    SENDGRID_TEMPLATE = 'd-20b76004f4e84c53a348d982b04608b2';
    break;
case 'DUPLICATE_EARLY':    
    SENDGRID_TEMPLATE = 'd-20b76004f4e84c53a348d982b04608b2';
    break;
}

        try {
             var request_body = {"from":{"email":"help@psbooks.co.uk"},"personalizations":[{"to":[{"email":CUSTOMER_EMAIL}],"dynamic_template_data":{"customer_name":email_customer_name,"refund_amount":parseFloat(REFUND_AMOUNT).toFixed(2)}}],"template_id":SENDGRID_TEMPLATE, "mail_settings": {"sandbox_mode": {"enable": false}}, "asm": {"group_id": 151077}};
    

                log.debug("Sendgrid Body",request_body);
              
                var headerObj = {
                    "content-type": "application/json",
                    "Authorization": "Bearer "+ SENDGRID_KEY
                };
                log.debug("Sendgrid Header",JSON.stringify(headerObj));

                var sendgridResponse = https.post({
                    url: SENDGRID_URL,
                    headers: headerObj,
                    body: JSON.stringify(request_body)
                });

                log.debug("endgrid Response Body",sendgridResponse);

                log.audit("Sent Email","Refund email sent to " + CUSTOMER_EMAIL)

                }
     
        catch (e) {
            log.debug("MAP ERROR : " + e.name, e.message);
        }
    }


    return {
        onAction: onAction
    }
}); 