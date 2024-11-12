/**
 * Name				: nbs272_media_code_ue.js
 * Property of 		: NoBlue
 * Customer 		: Sandpiper Books
 * Type				: User Event script on Sales Order Before Submit
 * Comments			: 
 * Script Version 	: 1.0			  
 * NOTES			: 
 * 
 * Version		Date            	Author      	Remarks
 * 1.0       	03/04/2017			NoBlue(AC)		Initial development
 * 1.1			13/03/2019			NoBlue(BO)		Updated the script parameter reading
 **/


/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Operation types: create, edit, delete, xedit
 *                      approve, reject, cancel (SO, ER, Time Bill, PO & RMA only)
 *                      pack, ship (IF)
 *                      markcomplete (Call, Task)
 *                      reassign (Case)
 *                      editforecast (Opp, Estimate)
 * @returns {Void}
 */

function userEventBeforeSubmit(type){
	
	var currentRecord = nlapiGetNewRecord();
   	var leadSource = currentRecord.getFieldValue('leadsource');
   	var campaign = nlapiLoadRecord('campaign', leadSource);
	var channel = campaign.getFieldValue('custevent_nbs_channel');
	if(!!channel){
			currentRecord.setFieldValue('class', channel);
	}
    
}