/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record','N/runtime'], function(record, runtime) {

    function beforeSubmit(context) {

        const dlShipMethodsList = runtime.getCurrentScript().getParameter('custscript_ps_dl_ship_methods')
        const dlShipMethods = dlShipMethodsList.split(",");

        var fulfillmentRecord = context.newRecord;
        log.debug('Running for fulfillment  ' + fulfillmentRecord.id)
        var shipMethod = fulfillmentRecord.getValue({fieldId: 'shipmethod'});
        var shipStatus = fulfillmentRecord.getValue({fieldId: 'shipstatus'});
        var soNum = fulfillmentRecord.getValue({fieldId: 'sonum'});

        log.debug('Ship status is ' + shipStatus)

        if ((dlShipMethods.indexOf(shipMethod)>-1)&&(shipStatus=='C')){
            log.debug ('Ship method matches and status is shipped');

            var packageCount = fulfillmentRecord.getLineCount({
                sublistId: 'package'
            })

            log.debug ('Fulfilment has ' + packageCount + ' packages')

            if(packageCount>0){

                log.debug ('Removing all existing packages')
                    for (var i = 0; i < packageCount; i++) {
                        fulfillmentRecord.removeLine({
                            sublistId: 'package',
                            line: i,
                            ignoreRecalc: true
                        })
                    log.debug('Package Removed!')
                    i--
                    packageCount--
                    }
             }


             log.debug('Adding new package line')

             fulfillmentRecord.insertLine({
                sublistId: 'package',
                line: 0
             });

             fulfillmentRecord.setSublistValue({
                sublistId: 'package',
                fieldId: 'packagetrackingnumber',
                line: 0,
                value: soNum   
             });

             fulfillmentRecord.setSublistValue({
                sublistId: 'package',
                fieldId: 'packageweight',
                line: 0,
                value: 1
             });


             log.audit('Fulfilment ' + fulfillmentRecord.id + ' for order ' + soNum + ' processed')

    }else{

        log.debug('Shipping method is NOT DirectLink or status is NOT shipped, exiting')

    }


}

    return {

        beforeSubmit: beforeSubmit 

    };
}); 