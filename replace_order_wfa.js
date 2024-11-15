/**
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 */
define(['N/record','N/runtime','N/task','./moment.js', 'N/https', 'N/search'], function(record, runtime,task, moment, https, search) {
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



    var itemsOOS = [];

    for (var i = 0; i < itemcountsWithoutMWP; i++) {
        var lineNum = replacementOrderRecord.selectLine({
            sublistId: 'item',
            line: i
        });

        log.audit("Updating line " + i)

        lineItemId = replacementOrderRecord.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'item',
            line: i
        })

        log.audit("Checking stock for item " + lineItemId);

        var columns = [search.createColumn({name: "quantityavailable", label: "Available"})];
        var filters = [["internalid","anyof",lineItemId]];

        var itemSearchObj = search.create({
               type: "item",
               filters: filters,
               columns: columns
        });

            itemSearchObj.run().each(function(result){
               lineItemAvailable = result.getValue(columns[0]);
            });

        if (!!lineItemAvailable){

        log.audit("Item has stock level " + lineItemAvailable);
        }

        if ((lineItemAvailable<=0)||(!lineItemAvailable)){

            log.audit("Item is OOS, removing")
            itemsOOS.push[lineItemId]

            replacementOrderRecord.removeLine({
                sublistId: 'item',
                line: i,
                ignoreRecalc: true
            })

        }

        else{
            
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

            replacementOrderRecord.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'custcol_nbs272_quantityavailable',
            line: i,
            value: lineItemAvailable,
            ignoreFieldChange: true
        });


        }


        replacementOrderRecord.setValue({
            fieldId: 'memo',
            value: ' The following item(s) are out of stock and were removed from the replacment order - ' + itemsOOS


        })

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
