/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record'], function(record) {
    function beforeLoad(context) {
        var RMAForm = context.form;
        RMAForm.removeButton('closeremaining');      
    }
    function beforeSubmit(context) {
       
    }
    function afterSubmit(context) {
       
    }
    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
}); 