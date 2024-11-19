/**
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 */
define(['N/record','N/runtime'], function(record, runtime) {
    function onAction(scriptContext){


var myScript = runtime.getCurrentScript();


	var mrTask = task.create({
 	taskType: task.TaskType.MAP_REDUCE,
 	scriptId: '1171',
 	deploymentId: 'customdeploy2',
 	});
	var mrTaskId = mrTask.submit();


 
    }
    return {
        onAction: onAction
    }
}); 