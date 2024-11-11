/**
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 */
define(['N/record','N/runtime','N/task','./moment.js', 'N/https'], function(record, runtime,task, moment, https) {
function onAction(scriptContext){


//Set variables based on script parameters

var myScript = runtime.getCurrentScript();
const ORDER_ID = myScript.getParameter('custscript_replace_orderid');

try {

  /*  log.audit("Opening Sales Order " + ORDER_ID)

    var salesorderRecord = record.load({
    type: record.Type.SALES_ORDER, 
    id: ORDER_ID,
    isDynamic: false,
    });
*/


    log.audit("Copying Sales Order " + ORDER_ID)
    
    var replacementOrderRecord = record.copy({
    type: record.Type.SALES_ORDER,
    id: ORDER_ID,
    isDynamic: true
    });
    
    var itemcounts = replacementOrderRecord.getLineCount({
                    sublistId: 'item'});

    log.audit("Copied! Order has " + itemcounts + " lines")

    replacementOrderRecord.setValue({
    fieldId: 'ccnumber',
    value: null
    });

    replacementOrderRecord.setValue({
    fieldId: 'getauth',
    value: false
    });

    replacementOrderRecord.setValue({
    fieldId: 'custbody_nbs_replacement',
    value: true
    });

    replacementOrderRecord.setValue({
    fieldId: 'shippingcost',
    value: 0
    });

    replacementOrderRecord.setValue({
    fieldId: 'custbody_nbs_onhold',
    value: true
    });

    replacementOrderRecord.setValue({
    fieldId: 'custbody_nbs_onholdreason',
    value: 35
    });

    replacementOrderRecord.setValue({
    fieldId: 'custbody_ps_magento_order_total',
    value: 0
    });


   var mwpLine
    do{
    var mwpLine = replacementOrderRecord.findSublistLineWithValue({
    sublistId: 'item',
    fieldId: 'item',
    value: 27062})

        if (mwpLine==-1){
            log.audit("No MWP lines remaining")
        }
        else {

            log.audit("MWP found on line " + mwpLine + ", removing")
            replacementOrderRecord.removeLine({
                sublistId: 'item',
                line: mwpLine,
                ignoreRecalc: true
            })
        }

    
    }while (mwpLine!=-1)

   var discountLine
    do{
    var discountLine = replacementOrderRecord.findSublistLineWithValue({
    sublistId: 'item',
    fieldId: 'item',
    value: 240932})

        if (discountLine==-1){
            log.audit("No discount lines remaining")
        }
        else {

            log.audit("Discount found on line " + discountLine + ", removing")
            replacementOrderRecord.removeLine({
                sublistId: 'item',
                line: discountLine,
                ignoreRecalc: true
            })
        }

    
    }while (discountLine!=-1)


    var itemcountsWithoutMWP = replacementOrderRecord.getLineCount({
                    sublistId: 'item'});


    for (var i = 0; i < itemcountsWithoutMWP; i++) {
        var lineNum = replacementOrderRecord.selectLine({
            sublistId: 'item',
            line: i
        });

        log.audit("Updating line " + i)
            
            replacementOrderRecord.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'price',
            line: i,
            value: -1,
            ignoreFieldChange: true
        });

            replacementOrderRecord.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'rate',
            line: i,
            value: 0,
            ignoreFieldChange: true
        });


            replacementOrderRecord.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'amount',
            line: i,
            value: 0,
            ignoreFieldChange: true
        });

            replacementOrderRecord.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'quantity',
            line: i,
            value: 0,
            ignoreFieldChange: true
        });


        log.audit("Comitting Line " + i)
            replacementOrderRecord.commitLine({
                sublistId: 'item',
                line: i
            });
        

    }

    var copiedRecord = replacementOrderRecord.save();

    log.audit("Created new SO  " + copiedRecord)

    
    log.audit("Opening original SO for editing")

    var salesorderRecord = record.load({
    type: record.Type.SALES_ORDER, 
    id: ORDER_ID,
    isDynamic: true,
    });


    log.audit("Sales order " + ORDER_ID + " opened")

    salesorderRecord.setValue({
    fieldId: 'custbody_ps_replacement_order_id',
    value: copiedRecord
    });

    salesorderRecord.save();

    log.audit("Replacement order ID field populated")


 }
     
        catch (e) {
            log.audit("ERROR : " + e.name, e.message);
        }
    }


    return {
        onAction: onAction
    }
}); 
