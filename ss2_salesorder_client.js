/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define([
        'N/log',
        'N/currentRecord',
        '/SuiteScripts/lib/ss2_digital_ocean_calculate_shipping'
    ],
     (
        log,
        currentRecord,
        shippingCalculator
    )  => {

        const pageInit = (context) => {
            shippingCalculator.handleCalculateButtonVisibility(context);
        }

        const fieldChanged = (context) => {
            if(_isOnItemSublist(context)){
                if(context.fieldId == 'quantity'){
                    shippingCalculator.setCalculateShippingReminders(context);
                }
            }
            if(context.fieldId === 'shipmethod'){
                shippingCalculator.handleShipMethodChange(context);
            }
        }

        const validateDelete = (context) => {
            _maybeSetCalculateShippingReminder(context);
            return true;
        }

        const validateInsert = (context) => {
            _maybeSetCalculateShippingReminder(context);
            return true;
        }

         const validateLine = (context) => {
            if(_lineItemAddedIsNotEmpty(context)) {
                _maybeSetCalculateShippingReminder(context);
                shippingCalculator.handleLineItemIsInserted(context);
            }
             return true;
         }

        const _isOnItemSublist = (context) => {
            return context.sublistId = 'item';
        }

        const _maybeSetCalculateShippingReminder = (context) => {
            if(_isOnItemSublist(context)){
                shippingCalculator.setCalculateShippingReminders(context);
            }
        }

        const _lineItemAddedIsNotEmpty = (context) => {
            const item = context.currentRecord.getCurrentSublistValue({
                sublistId: 'item', fieldId: 'item'
            });
            return item;
        }

        return {
            pageInit, fieldChanged, validateDelete, validateInsert, validateLine
        };
    });