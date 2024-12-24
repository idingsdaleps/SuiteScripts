/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/search', 'N/runtime', 'N/record', 'N/https'],
    
    (search, runtime, record, https) => {
        
        const getInputData = (context) => {
            const salesOrdersToPostSavedSearch = runtime.getCurrentScript().getParameter('custscript_ps_conf_search');
            
            if(salesOrdersToPostSavedSearch){
                return search.load({id: salesOrdersToPostSavedSearch});
            } else{
                log.audit('SalesOrdersEmailConf', `There is no SalesOrder search provided in Parameters. Exiting`);
                return [];
            }
        }
        
        const reduce = (context) => {
            const salesOrderDetails = _extractSalesOrder(context.values);
            log.audit('SalesOrdersEmailConf.reduce', `SalesOrder I am going to send: ${salesOrderDetails.order_number}`);
            if(_sendSalesOrderConfEmail(salesOrderDetails)){
                log.audit('SalesOrdersEmailConf.reduce', `Updating SalesOrder ${salesOrderDetails.order_number} as Sent.`);
                const salesOrderId = context.key;
                

                record.submitFields({
                type: record.Type.SALES_ORDER,
                id: salesOrderId,
                values: {
                    'custbody_ps_conf_sent': true
                },
                
            }) 
            }
        }
        
        const summarize = (context) => {

        }
        
        const _extractSalesOrder = (rawSalesOrderRows) => {

            try{

            const salesOrder = {};
            rawSalesOrderRows.forEach(row => {
                const rowJson = JSON.parse(row),
                    salesOrderRowDetails = rowJson.values;
                if(!salesOrder.items > 0){
                    salesOrder["order_number"] = salesOrderRowDetails.tranid;
                    salesOrder["customer_name"] = salesOrderRowDetails.billaddressee;
                    salesOrder["order_date"] = salesOrderRowDetails.datecreated;
                    salesOrder["billing_name"] = salesOrderRowDetails.billaddressee;
                    salesOrder["billing_add1"] = salesOrderRowDetails.billaddress1;
                    salesOrder["billing_add2"] = salesOrderRowDetails.billaddress2;
                    salesOrder["billing_city"] = salesOrderRowDetails.billcity;
                    salesOrder["billing_postcode"] = salesOrderRowDetails.billzip;
                    salesOrder["billing_country"] = salesOrderRowDetails.billcountry.text;
                    salesOrder["billing_phone"] = salesOrderRowDetails.billphone;
                    salesOrder["delivery_name"] = salesOrderRowDetails.shipaddressee;
                    salesOrder["delivery_add1"] = salesOrderRowDetails.shipaddress1;
                    salesOrder["delivery_add2"] = salesOrderRowDetails.shipaddress2;
                    salesOrder["delivery_city"] = salesOrderRowDetails.shipcity;
                    salesOrder["delivery_postcode"] = salesOrderRowDetails.shipzip;
                    salesOrder["delivery_country"] = salesOrderRowDetails.shipcountry.text;
                    salesOrder["delivery_phone"] = salesOrderRowDetails.shipphone;
                    salesOrder["delivery_method"] = salesOrderRowDetails.shipmethod.text.replace("Z-Hermes - ","");              
                    salesOrder["payment_method"] = salesOrderRowDetails.formulatext; 
                    salesOrder["delivery_total"] = salesOrderRowDetails.shippingamount; 
                    salesOrder["grand_total"] = salesOrderRowDetails.total; 
                    salesOrder["subtotal"] = (salesOrderRowDetails.total - salesOrderRowDetails.shippingamount).toFixed(2); 
                    salesOrder["email"] = salesOrderRowDetails.custbody_nbs272_entity_email;
                    salesOrder["source"] = salesOrderRowDetails.custbody_nbs_source.text.toLowerCase();
                    if (salesOrderRowDetails.custbody_nbs_newbalance < 0){
                        salesOrder["newbalance"] = salesOrderRowDetails.custbody_nbs_newbalance;
                    }
                    salesOrder["items"] = [];
                    salesOrder["lostItems"] = [];
                }
                
            if (salesOrderRowDetails.amount>0){
                const product = _extractProductDetails(salesOrderRowDetails);
                salesOrder["items"].push(product);
                }

            if (salesOrderRowDetails.custcol_nbs_quantitylost>0){
                const product = _extractLostProductDetails(salesOrderRowDetails);
                salesOrder["lostItems"].push(product);
                }

            })
            return salesOrder;} catch(e) {log.error("ERROR", e.message)}
        }
        
        const _extractProductDetails = (salesOrderRowDetails) => {

         
                return {
                "sku": salesOrderRowDetails['externalid.item'].value,
                "name": salesOrderRowDetails['displayname.item'],
                "price": salesOrderRowDetails['amount'],
                "qty": salesOrderRowDetails['quantity'],
                } 
        

        }

        const _extractLostProductDetails = (salesOrderRowDetails) => {

         
                return {
                "sku": salesOrderRowDetails['externalid.item'].value,
                "name": salesOrderRowDetails['displayname.item'],
                } 
        

        }

        const _sendSalesOrderConfEmail = (salesOrderDetails) => {
             const SENDGRID_TEMPLATE = runtime.getCurrentScript().getParameter('custscript_ps_conf_template');
            const SENDGRID_URL = runtime.getCurrentScript().getParameter('custscript_ps_conf_url');
            const SENDGRID_KEY = runtime.getCurrentScript().getParameter('custscript_ps_conf_key');
            const LIVE_MODE = runtime.getCurrentScript().getParameter('custscript_ps_conf_livemode');
            const TEST_EMAIL = runtime.getCurrentScript().getParameter('custscript_ps_conf_testemail');
            
            if(LIVE_MODE == true){
                var CUSTOMER_EMAIL = salesOrderDetails.email;
                } else{
                    log.debug('NOT in Live Mode, using ' + TEST_EMAIL)
                var CUSTOMER_EMAIL = TEST_EMAIL;
            }

            
 
            log.audit("SalesOrdersEmailConf.sendEmail", "Sending email to " + CUSTOMER_EMAIL)

            var request_body = {"from":{"email":"help@psbooks.co.uk"},"personalizations":[{"to":[{"email":CUSTOMER_EMAIL}],"dynamic_template_data":salesOrderDetails}],"template_id":SENDGRID_TEMPLATE, "mail_settings": {"sandbox_mode": {"enable": false}}, "asm": {"group_id": 151077}};

            log.debug("SalesOrdersEmailConf.sendEmail", request_body)

            var headerObj = {
                "content-type": "application/json",
                "Authorization": "Bearer "+ SENDGRID_KEY
            };

            const response = https.post({
                url: SENDGRID_URL,
                headers: headerObj,
                body: JSON.stringify(request_body)
            });

            log.audit('SalesOrdersEmailConf.postSalesOrder', `Response: ${JSON.stringify(response.code)}`);
            const responseBody = response.body;
            if(!responseBody.code === '202'){
                log.error('SalesOrdersEmailConf.postSalesOrder', `Could not Post ${salesOrderDetails.order_number} to Sendgrid.
                    Reason: ${JSON.stringify(responseBody)}`)
                return false;
            } 
            return true;
        }
        
        
        return {getInputData, reduce, summarize}

    });