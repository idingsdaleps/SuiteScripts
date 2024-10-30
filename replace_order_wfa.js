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
    fieldId: 'customlist_nbs_onholdreason',
    value: 35
    });





    for (var i = 0; i < itemcounts; i++) {
        var lineNum = replacementOrderRecord.selectLine({
            sublistId: 'item',
            line: i
        });

        log.audit("Updating line " + i)

        var lineItem = replacementOrderRecord.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'item',
            line: i,
        });


        if (lineItem==27062){

            log.audit("Removing MWP from line " + i )

/*            replacementOrderRecord.removeLine({
                sublistId: 'item',
                line: i,
                ignoreRecalc: true
            })
*/
        }

        else{

            log.audit("Processing item " + lineItem + " on line " + i)

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

