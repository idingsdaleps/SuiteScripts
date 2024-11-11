/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/error', 'N/search', 'N/log', 'N/ui/message', 'N/currentRecord'],
    function(error, search, log, message, currentRecord) 
    {
        function fieldChanged(context) 
        {
         var sublistFieldName = context.fieldId;
    	  if (sublistFieldName === 'ccnumber')
          {	
            var currentRecord = context.currentRecord;
          
            var line = context.line;
            
            log.debug('currentRecord', currentRecord);
            
            var type = currentRecord.type;
            
            var customer = '';
            if(type == 'salesorder')
            {
            	customer = currentRecord.getValue({fieldId: 'entity'});//customer
            }
            else if(type == 'customerpayment')
            {
            	customer = currentRecord.getValue({fieldId: 'customer'});//customer
            }
            
           
            
            if(customer)
            {
            	 var name = search.lookupFields({
         		    type: search.Type.CUSTOMER,
         		    id: customer,
         		    columns: ['firstname', 'lastname']
         		});
            	 
            	 log.debug('name', name);
            	
            	 currentRecord.setValue({
                     fieldId: 'ccname',
                     value: name.firstname + ' ' +  name.lastname
                 });
            }
            	
            }

               
       }
     
       function findPendingOrders(customer){

        console.log("Searching for orders against customer  " + customer);
        var customerSearchObj = search.create({
           type: "customer",
           filters:
           [
              ["transaction.type","anyof","SalesOrd"], 
              "AND", 
              ["transaction.anylineitem","anyof","373075"], 
              "AND", 
              ["formulatext: {transaction.custbody_ps_credit_redemption_procd}","is","F"], 
              "AND", 
              ["internalid","anyof",customer]
           ],
           columns:
           [
              search.createColumn({name: "internalid", label: "Internal ID"}),
              search.createColumn({
                 name: "internalid",
                 join: "transaction",
                 label: "Internal ID"
              }),
              search.createColumn({
                 name: "custbody_ps_credit_redemption_invoice",
                 join: "transaction",
                 label: "Credit Redemption Invoice"
              })
           ]
        });
        var searchResultCount = customerSearchObj.runPaged().count;
        console.log("Unbilled credit orders - " + searchResultCount);

        return searchResultCount;

       }


        function addCredit(context){
            var cr = currentRecord.get();
            var customer = cr.getValue({fieldId: 'entity'});
            var balance = cr.getValue({fieldId: 'balance'});

            var negatedBalance = balance/-1

            var pendingOrders = findPendingOrders(customer)


            if ((balance<0)&&(pendingOrders>0)){
                var myMsg = message.create({
                 title: "Pending Orders", 
                 message: "Customer has unbilled credit orders. Please try again later", 
                 type: message.Type.INFORMATION
                });
                myMsg.show({ duration : 5000 });

            }

            if ((balance<0)&&(pendingOrders==0))

            {

                do
                {var creditLine = cr.findSublistLineWithValue({
                sublistId: 'item',
                fieldId: 'item',
                value: 373075})

                if (creditLine!=-1){
                    cr.removeLine({
                    sublistId: 'item',
                    line: creditLine
                    })


                    console.log("Removed previous credit line")
                    }

                }while (creditLine!=-1)

                try{

                    var amount = cr.getValue({fieldId: 'total'});
                    console.log("Order Amount " +  amount)
                    var creditToApply = Math.min(negatedBalance, amount)
                    var creditToApplyAmount = creditToApply/-1

                    cr.selectNewLine({
                    sublistId: 'item',
                     })
                    
                    cr.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    value: 373075,
                    fireSlavingSync: true
                     })
        
                    cr.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'price',
                    value: '-1',
                    fireSlavingSync: true
                    })

                    cr.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'amount',
                    value: creditToApplyAmount,
                    fireSlavingSync: true
                    })

                    cr.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    value: creditToApplyAmount,
                    fireSlavingSync: true
                    })

                    cr.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'taxcode',
                    value: 11,
                    fireSlavingSync: true
                    })

                    cr.commitLine({
                        sublistId: 'item'
                    })

                     var myMsg = message.create({
                     title: "Credit Applied", 
                     message: "Customer has credit of £" + negatedBalance + ", applied £" + creditToApply,
                     type: message.Type.INFORMATION
                    });
                    myMsg.show({ duration : 60000 });

            } catch (e){
                console.log(e)
            }
            }

            if(balance>=0)
            {
                var myMsg = message.create({
                 title: "No Credit", 
                 message: "Customer has no credit balance available", 
                 type: message.Type.INFORMATION
                });
                myMsg.show({ duration : 5000 });
            }


    }
        
       
        return {
            fieldChanged: fieldChanged,
            addCredit: addCredit
        };
    });