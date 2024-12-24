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



    log.audit("Copying Sales Order " + ORDER_ID)
    
    var replacementOrderRecord = record.copy({
    type: record.Type.SALES_ORDER,
    id: ORDER_ID,
    isDynamic: true
    });
    
    var itemcounts = replacementOrderRecord.getLineCount({
                    sublistId: 'item'});

    log.audit("Copied! Order has " + itemcounts + " lines")


    // Set some replacement specific fields on the order


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


    //Process order lines


    var itemsOOS = '';

    for (var i = 0; i < itemcounts; i++) {
        var lineNum = replacementOrderRecord.selectLine({
            sublistId: 'item',
            line: i
        });

        log.audit("Updating line " + i)

    //Get the item ID of the line

        lineItemId = replacementOrderRecord.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'item',
            line: i
        })

    
    //Remove discount and MWP lines

        if (lineItemId == 27062 || lineItemId == 240932 || lineItemId == 324554){

            log.audit("Removing invalid item")
            
            replacementOrderRecord.removeLine({
                sublistId: 'item',
                line: i,
                ignoreRecalc: true
            })

            i--;
            itemcounts--;
        } else {

    //Check stock level

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



    //Remove line if its out of stock

        if ((lineItemAvailable<=0)||(!lineItemAvailable)){

            log.audit("Item is OOS, removing")
            itemsOOS = itemsOOS + ' ' + lineItemId

            replacementOrderRecord.removeLine({
                sublistId: 'item',
                line: i,
                ignoreRecalc: true
            })

            i--;
            itemcounts--;

        }

        else{


    //Update in-stock items with 0qty and price etc

            replacementOrderRecord.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'quantity',
            line: i,
            value: 0,
            ignoreFieldChange: true
        });
            
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
            fieldId: 'custcol_nbs272_quantityavailable',
            line: i,
            value: lineItemAvailable,
            ignoreFieldChange: true
        });

            


    //Commit the line


        log.audit("Comitting Line " + i + " item ID " + lineItemId)
            replacementOrderRecord.commitLine({
                sublistId: 'item',
                line: i
            });
        }
    }



}    


    //Set memo to reference replacement order and items removed (if applicable)

    if (itemsOOS.length>0){

    replacementOrderRecord.setValue({
    fieldId: 'memo',
    value: 'Replacment for order ' + ORDER_ID + ', the folllowing items were removed due to being OOS - ' + itemsOOS
    });


    }
    else{

    replacementOrderRecord.setValue({
    fieldId: 'memo',
    value: 'Replacment for order ' + ORDER_ID
    });

    }


    //Save the new order

    log.audit("Saving new order")


    var copiedRecord = replacementOrderRecord.save();

    log.audit("Created new SO  " + copiedRecord)



    //Link the original order to the replacement

    log.audit("Setting replacement ID on original order" )

    record.submitFields({
                type: record.Type.SALES_ORDER,
                id: ORDER_ID,
                values: {
                    'custbody_ps_replacement_order_id': copiedRecord
                }})

        
    log.audit("Replacement order ID field populated, replacement complete")


 }
     
        catch (e) {
            log.audit("ERROR : " + e.name, e.message);
        }
    }


    return {
        onAction: onAction
    }
}); 
