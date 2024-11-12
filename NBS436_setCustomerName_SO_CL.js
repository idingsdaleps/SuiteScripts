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


        function totalPendingOrders(customer){

        console.log("Found outstanding credit orders, totalling for customer  " + customer);
        var customerSearchObj = search.create({
           type: "customer",
           filters:
           [
              ["transaction.anylineitem","anyof","373075"], 
              "AND", 
              ["transaction.custbody_ps_credit_redemption_procd","is","F"], 
              "AND", 
              ["transaction.mainline","is","F"], 
              "AND", 
              ["internalid","anyof",customer], 
              "AND", 
              ["transaction.type","anyof","SalesOrd"]
            ],
           columns:
           [
              search.createColumn({
                 name: "internalid",
                 summary: "GROUP",
                 label: "Internal ID"
              }),
              search.createColumn({
                 name: "formulacurrency",
                 summary: "SUM",
                 formula: "case when {transaction.item} = 'CREDIT_REDEEM' then {transaction.amount} else 0 end",
                 label: "Formula (Currency)"
              })
           ]
        });

        var outstandingBalance = 0

        customerSearchObj.run().each(function(result){
                outstandingBalance = outstandingBalance + Number(result.getValue({name: "formulacurrency",
                 summary: "SUM",
                 formula: "case when {transaction.item} = 'CREDIT_REDEEM' then {transaction.amount} else 0 end",
                 label: "Formula (Currency)"

                }));
             return true;
         });

        console.log("Unbilled credit orders total - " + outstandingBalance);

        return outstandingBalance;

       }





        function addCredit(context){
            var cr = currentRecord.get();
            var customer = cr.getValue({fieldId: 'entity'});
            var nsBalance = cr.getValue({fieldId: 'balance'});

            

            console.log("NS Balance " + nsBalance)

            var negatedBalance = balance/-1

            var pendingOrders = findPendingOrders(customer)

            if(pendingOrders>0){
                var pendingBalance = totalPendingOrders(customer)
            }
            else{
                var pendingBalance = 0
            }

            var balance = nsBalance - pendingBalance

            console.log("Calculated Balance " + balance)
            var amount = cr.getValue({fieldId: 'total'});


            if ((balance<0)&&(amount>0))

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

                    
                    console.log("Order Amount " +  amount)
                    var creditToApply = Math.min(negatedBalance, amount)
                    var creditToApplyAmount = creditToApply/-1
                    var newBalance = balance - creditToApplyAmount

                    cr.setValue({
                    fieldId: 'custbody_nbs_newbalance',
                    value: newBalance
                    })

                    console.log("New Balance " + newBalance)

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

            if(amount<=0)
            {
                var myMsg = message.create({
                 title: "Credit Unavaible", 
                 message: "Order total must be greater than 0 to apply credit", 
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