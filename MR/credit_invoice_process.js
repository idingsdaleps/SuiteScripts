/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */


// PSBooks credit invoice processor


define(['N/search', 'N/runtime', 'N/https','N/record','N/file','N/currentRecord'],
function (search, runtime, https, record, file, currentRecord) {

    var scriptObj = runtime.getCurrentScript();
    const SAVED_SEARCH_ID = scriptObj.getParameter('custscript_custcredit_search'); 


//Get input from saved search and push values into array

    function getInputData() {
        try {
            log.audit("GET INPUT", "**SCRIPT START**");
            var returnArray = new Array();

            var salesorderSearchObj = search.load({
                id: SAVED_SEARCH_ID
            });
            
            var searchResultCount = salesorderSearchObj.runPaged().count;
            log.audit("Search Returned", searchResultCount + " results")   
            salesorderSearchObj.run().each(function (result) {
            var tempObj = {};

                returnArray.push(tempObj);
                tempObj["custID"] = result.getValue({
                     name: "internalid",
                     join: "customer",
                     summary: "GROUP",
                     label: "customer_id"
                  });
                tempObj["creditAmount"] = result.getValue({
                     name: "formulacurrency",
                     summary: "MIN",
                     formula: "case when {item} = 'CREDIT_REDEEM' then {amount} else 0 end",
                     label: "credit_amount"
                  }),
                tempObj["custBalance"] = result.getValue({
                     name: "balance",
                     join: "customer",
                     summary: "GROUP",
                     label: "customer_balance"
                  }),
                tempObj["orderID"] = result.getValue({
                     name: "internalid",
                     summary: "GROUP",
                     label: "order_id"
                  })

              log.debug("SEARCH RESPONSE", result)

                return true;
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
            var orderID = requestObj.orderID;
            var creditAmount = requestObj.creditAmount/-1;
            var custBalance = requestObj.custBalance/-1;

            if (creditAmount>custBalance){

                log.audit("FAILED", "Failed to create credit invoice for customer " + custID + " as insufficient credit balance available")

            }

            else{       

                 log.audit("CONTINUING", "Credit balance sufficient, proceeding to create invoice for customer ID " + custID)

                 var invRec = record.transform({
                    fromType: record.Type.CUSTOMER,
                    fromId: custID,
                    toType: record.Type.INVOICE,
                    isDynamic: true,
                    defaultValues: {customform:104}
                });

                 invRec.setValue({
                    fieldId: 'memo',
                    value: 'Auto created credit redemption invoice for order ' + orderID,
                    ignoreFieldChange: true
                });

                 invRec.setValue({
                    fieldId: 'location',
                    value: 1,
                    ignoreFieldChange: true
                });


                invRec.selectNewLine({
                    sublistId: 'item'
                });

                invRec.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                value: 373077,
                ignoreFieldChange: true
                 });

                invRec.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'quantity',
                value: 1,
                ignoreFieldChange: true
                 });

                invRec.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'amount',
                value: creditAmount,
                ignoreFieldChange: true
                 });

                invRec.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'taxcode',
                value: 11,
                ignoreFieldChange: true
                 });

                invRec.commitLine({
                    sublistId: 'item'
                });


                invRec.setValue({
                    fieldId: 'shippingcost',
                    value: 0,
                    ignoreFieldChange: true
                });

                invRec.setValue({
                    fieldId: 'total',
                    value: creditAmount,
                    ignoreFieldChange: true
                });


                var recId = invRec.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                });
                log.audit("CREATED", "Invoice " + recId + " saved")

                log.audit("SALES_ORDER", "Opening Sales Order for editing")

                var salesorderRecord = record.load({
                type: record.Type.SALES_ORDER, 
                id: orderID,
                isDynamic: true,
                });


                log.audit("SALES_ORDER", "Sales order " + orderID + " opened")

                salesorderRecord.setValue({
                fieldId: 'custbody_ps_credit_redemption_invoice',
                value: recId
                });

                salesorderRecord.setValue({
                fieldId: 'custbody_ps_credit_redemption_procd',
                value: true
                });


                salesorderRecord.save();

                log.audit("SALES_ORDER", "Invoice ID field populated")


            



            var customerPayment = record.transform({
                    fromType: record.Type.INVOICE,
                    fromId: recId,
                    toType: record.Type.CUSTOMER_PAYMENT,
                    isDynamic: true
            });

            log.audit("PAYMENT", "Customer payment created, applying credit lines for £" + creditAmount)



            function _applyPayment(creditAmount){
            var nextCreditAmountToSet = creditAmount;
            for(var i = 0; i < customerPayment.getLineCount('credit'); i++){
                customerPayment.selectLine({sublistId: 'credit', line: i});
                var creditLineAvailable = customerPayment.getCurrentSublistValue({sublistId: 'credit', fieldId: 'due'});
                customerPayment.setCurrentSublistValue({sublistId: 'credit', fieldId: 'amount', value: nextCreditAmountToSet});
                customerPayment.commitLine({sublistId: 'credit'});
                if(creditLineAvailable < nextCreditAmountToSet){
                    log.audit("PAYMENT LINE", "Line " + i + " has " + creditLineAvailable + " available, applying and moving to next line")
                    nextCreditAmountToSet = nextCreditAmountToSet - creditLineAvailable;
                } else{
                    log.audit("PAYMENT LINE", "Line " + i + " has " + creditLineAvailable + " available, no more to apply")
                    break
                }

            }

            log.audit("CREDIT", "Credit lines applied, saving")
            customerPayment.save({ignoreMandatoryFields: true});
            log.audit("PAYMENT SAVED", "Customer payment saved")

            }

            _applyPayment(creditAmount);
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