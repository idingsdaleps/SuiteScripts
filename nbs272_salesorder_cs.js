/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 * 
 * Version      Date                Author          Remarks
 * 2.0          12 June 2019        NoBlue(BO)      added  CH-78 -> count inventory items
 * 2.1          18 Sept 2020        NoBlue(SDK)     Adding Sublist count
 */
define(['N/record', 'N/runtime', 'N/search', 'N/log'],

function(record, runtime, search, log) {
    
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext) {
        if (runtime.executionContext != runtime.ContextType.WEBSTORE){
            log.debug('pageInit');
            var currentRecord = scriptContext.currentRecord;
            setGetAuth(currentRecord);  
            setSalesOrderFieldsFromCustomer(currentRecord);

        
            function setSalesOrderFieldsFromCustomer(newRecord){
                var fields = {custbody_nbs436_data_protection_flag:'custentity_nbs_dataprotectionflag',
                              custbody_nbs436_dns_to_thirdparty:'custentity_nbs_donotsendtothirdparty',
                              custbody_nbs436_dns_postal_catalogue:'custentity_nbs_donotsendpostalcatalogue',
                              custbody_nbs436_dns_surveys:'custentity_nbs_donotsendsurveys',
                              custbody_nbs436_dns_email_marketing:'custentity_nbs_donotsendemailmarketing',                      
                };
                
                var entityId = newRecord.getValue({fieldId:'entity'});



                

                if (entityId){
                    log.debug('entityId',entityId);
                    itemsPurchased = getPreviousItems(entityId);
                    console.log(itemsPurchased)
                    var entityFields = [];
                    for(var f in fields){
                        entityFields.push(fields[f]);       
                    }
                    
                    search.lookupFields.promise({
                        type: record.Type.CUSTOMER,
                        id: entityId,
                        columns: entityFields
                    })
                    .then(function (customerFields){
                        for(var f in fields){
                            var customerFieldValue = customerFields[fields[f]];
                            
                            log.debug('customerFieldValue',customerFieldValue);
                            if (Array.isArray(customerFieldValue)){
                                customerFieldValue = customerFieldValue.length == 0 ? "" : customerFieldValue[0].value;
                                log.debug('customerFieldValue',customerFieldValue);
                            }

                            newRecord.setValue({fieldId : f, value : customerFieldValue});
                        }
                    });
                    

                }
            }
        }
    }

    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function setGetAuth(currentRecord){
        var getAuth = !!currentRecord.getValue({fieldId:'ccnumber'}) && !!currentRecord.getValue({fieldId:'ccsecuritycode'}) && !!currentRecord.getValue({fieldId:'ccexpiredate'});
        console.log(getAuth);
       currentRecord.setValue({fieldId:'getauth', value:getAuth});
      //if(getAuth == true){
       // currentRecord.setValue({fieldId:'paymentmethod', value:23});
      //}
       if(getAuth == true){
        currentRecord.setValue({fieldId:'paymentmethod', value:30});
      }
      //else
      //{
        //currentRecord.setValue({fieldId:'paymentmethod', value:''});
      //}
        
    }
    
    function fieldChanged(scriptContext) {

   if (scriptContext.fieldId=='entity'){

            var currentRecord = scriptContext.currentRecord;
            var entityId = currentRecord.getValue({fieldId:'entity'});



            if (entityId){
                    log.debug('entityId',entityId);
                    itemsPurchased = getPreviousItems(entityId);

                }
        }

        if (runtime.executionContext != runtime.ContextType.WEBSTORE){
            if(scriptContext.fieldId == 'ccnumber' || scriptContext.fieldId == 'ccsecuritycode' || scriptContext.fieldId == 'ccexpiredate'){
                setGetAuth(scriptContext.currentRecord);
            }
        }
    }
    
    function validateEmail(currentRecord){
        var entityId = currentRecord.getValue({fieldId:'entity'});
        console.log('test');
        if(!!entityId){
            var customer = record.load({type: 'customer',id: entityId});
            var role = customer.getValue({fieldId:'accessrole'});
            var giveaccess = customer.getValue({fieldId:'giveaccess'});
            if(role == 14 && giveaccess){
                var curEmail= currentRecord.getValue({fieldId:'custbody_nbs272_entity_email'});
                var customerEmail = customer.getValue({fieldId:'email'});
                if(curEmail != customerEmail){
                    currentRecord.setValue({fieldId:'custbody_nbs272_entity_email', value:customerEmail});
                    return false;
                }
            }
        }
        return true;
    }
    
    /**
     * Function to be executed when field is slaved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     *
     * @since 2015.2
     */
    function postSourcing(scriptContext) {
        if (runtime.executionContext != runtime.ContextType.WEBSTORE){
            
            if (scriptContext.fieldId === 'entity'){
                setSalesOrderFieldsFromCustomer(scriptContext.currentRecord);
            }
            
        }
    }
    
    function setSalesOrderFieldsFromCustomer(newRecord){
        var fields = {custbody_nbs436_data_protection_flag:'custentity_nbs_dataprotectionflag',
                              custbody_nbs436_dns_to_thirdparty:'custentity_nbs_donotsendtothirdparty',
                              custbody_nbs436_dns_postal_catalogue:'custentity_nbs_donotsendpostalcatalogue',
                              custbody_nbs436_dns_surveys:'custentity_nbs_donotsendsurveys',
                              custbody_nbs436_dns_email_marketing:'custentity_nbs_donotsendemailmarketing',                      
                };
      
        var entityId = newRecord.getValue({fieldId:'entity'});
        
        if (entityId){
            
            var entityFields = [];
            for(var f in fields){
                entityFields.push(fields[f]);       
            }
            
            search.lookupFields.promise({
                type: record.Type.CUSTOMER,
                id: entityId,
                columns: entityFields
            })
            .then(function (customerFields){
                for(var f in fields){
                    var customerFieldValue = customerFields[fields[f]];
                    
                    if (Array.isArray(customerFieldValue)){
                        customerFieldValue = customerFieldValue.length == 0 ? "" : customerFieldValue[0].value;
                    }

                    newRecord.setValue({fieldId : f, value : customerFieldValue});
                }
            });
            

        }


    }

    /**
     * Function to be executed after sublist is inserted, removed, or edited.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function sublistChanged(scriptContext) 
    {
        var currentRecord = scriptContext.currentRecord;
        var sublistName = scriptContext.sublistId;
        
        if (sublistName === 'item'){
            try{
                var invItemCount = sumInventoryItems(currentRecord);
                currentRecord.setValue({
                    fieldId : 'custbody_nbs272_inv_item_count',
                    value : invItemCount
                });
            }catch(e){
                log.error('sumInventoryItems',e.message);
            }
            
        }
        
        function sumInventoryItems(record){
            var count = 0;
            for (var i=0; i< record.getLineCount({sublistId : 'item'}); i++){
                var itemType = record.getSublistValue({sublistId : 'item', fieldId: 'itemtype', line : i});
                
                count = itemType === "InvtPart"  || itemType === "Kit" ? count+parseInt(record.getSublistValue({sublistId : 'item', fieldId : 'quantity',line : i})) : count; 
            }
            
            return count;
        }
    }

    /**
     * Function to be executed after line is selected.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function lineInit(scriptContext) {

    }

    /**
     * Validation function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @returns {boolean} Return true if field is valid
     *
     * @since 2015.2
     */
    function validateField(scriptContext) {
       
        
        
    }

    /**
     * Validation function to be executed when sublist line is committed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateLine(scriptContext) {
        if (runtime.executionContext != runtime.ContextType.WEBSTORE){
            if(scriptContext.sublistId=='item'){
                var currentRecord = scriptContext.currentRecord;
                var itemId = currentRecord.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item'
                });
                var itemDisplay = currentRecord.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item_display'
                });
                var customerId = currentRecord.getValue({fieldId: 'entity'});
                if(!!customerId && !!itemId && (typeof itemsPurchased !== "undefined")){
                    //var salesOrders = getPreviousSalesOrders(currentRecord.id, customerId, itemId);
                    var itemHistory = itemsPurchased.filter(function(data){ return data.itemId == itemId})
                    if(itemHistory.length > 0){
                        var text = 'This customer has already purchased this item (' + itemDisplay + ')\n'; 
                        for(var s in itemHistory){
                            text += 'Quantity -' + itemHistory[s].quantity + ' - Most Recent Purchase - ' + itemHistory[s].date + '\n';
                        }
                        return confirm(text);
                    }
                }
            }
        }
        return true;
    }
    function getPreviousSalesOrders(currentId, customerId, itemId){
        var salesOrders = [];
        var columns = [
            search.createColumn({
                name: 'tranid',
                summary: 'GROUP'
            }),
            search.createColumn({
                name: 'trandate',
                summary: 'GROUP',
                sort: search.Sort.ASC
            })
        ];
        var filters = [['type','anyof','SalesOrd'], 
                        'AND', 
                        ['mainline','is','F'], 
                        'AND', 
                        ['status','noneof','SalesOrd:C','SalesOrd:H'], 
                        'AND', 
                        ['cogs','is','F'], 
                        'AND', 
                        ['shipping','is','F'], 
                        'AND', 
                        ['taxline','is','F'], 
                        'AND', 
                        ['name','anyof',customerId], 
                        'AND', 
                        ['item','anyof',itemId],
                        'AND', 
                        ['quantity','greaterthan','0']];
        
        if(!!currentId){
            filters.push('AND');
            filters.push(["internalidnumber","notequalto",currentId]);
        }
        
        var salesorderSearchObj = search.create({
            type: 'salesorder',
            filters: filters,
            columns: columns
        });
        salesorderSearchObj.run().each(function(result){
            salesOrders.push({documentNumber:result.getValue(columns[0]), date:result.getValue(columns[1])});
            return true;
        });
        return salesOrders;
    }


        function getPreviousItems(customerId){
        var itemsPurchased = [];


        var columns = [
            search.createColumn({
                 name: "internalid",
                 join: "item",
                 summary: "GROUP",
                 label: "Internal ID"
              }),
              search.createColumn({
                 name: "quantity",
                 summary: "COUNT",
                 label: "Quantity"
              }),
              search.createColumn({
                 name: "trandate",
                 summary: "MAX",
                 label: "Date"
              })
            ];

        var filters = [
              ["customer.internalid","anyof",customerId], 
              "AND", 
              ["type","anyof","SalesOrd"], 
              "AND", 
              ["mainline","is","F"], 
              "AND", 
              ["taxline","is","F"], 
              "AND", 
              ["shipping","is","F"]
           ]

        var salesorderSearchObj = search.create({
           type: "salesorder",
           filters: filters,
           columns: columns
          });
        
        salesorderSearchObj.run().each(function(result){
            itemsPurchased.push({itemId:result.getValue(columns[0]), quantity:result.getValue(columns[1]), date:result.getValue(columns[2])});
            return true;
        });
        return itemsPurchased;
    }

    /**
     * Validation function to be executed when sublist line is inserted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateInsert(scriptContext) {

    }

    /**
     * Validation function to be executed when record is deleted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateDelete(scriptContext) {

    }

    /**
     * Validation function to be executed when record is saved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */
    function saveRecord(scriptContext) {
        if (runtime.executionContext != runtime.ContextType.WEBSTORE){
            if(!validateEmail(scriptContext.currentRecord)){
                alert("This customer is a webstore user therefore the email can't be changed. Press OK to to clear this message and then SAVE the Sales Order.");
                return false;
            }
        }
        return true;
    }

    return {
        pageInit:pageInit,
        saveRecord:saveRecord,
        fieldChanged:fieldChanged,
        validateLine:validateLine,
        sublistChanged: sublistChanged,
        postSourcing: postSourcing
    };
    
});