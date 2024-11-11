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
// #############################################################
//
// DO NOT PUT THE BACK TO An AFTER SUBMIT IT FUCKS UP PAYPAL!!!!
//
// ############################################################# 
//
//function userEventAfterSubmit(type){
//	
//	//var currentRecord = nlapiGetNewRecord();
//	var currentRecord = nlapiLoadRecord(nlapiGetRecordType(),nlapiGetRecordId());
//   	var leadSource = currentRecord.getFieldValue('leadSource');
//   	if(!(!!leadSource)){
//   		var newLeadSource = ''; 
//   		var promotionId = currentRecord.getLineItemValue('promotions', 'promocode', 1);
//   		if(!!promotionId){
//   			var promotion = nlapiLoadRecord('promotioncode', promotionId);
//	   		newLeadSource = promotion.getFieldValue('custrecord_nbs_leadsource');
//   		}else{
//   			var defaultWebsiteId = nlapiGetContext().getSetting('SCRIPT', 'INTERNALWEBSITE');
//   			if(!!defaultWebsiteId){
//   				var source = currentRecord.getFieldValue('source');
//   				if(!!source){
//   					var defaultWebsite = nlapiLoadRecord('website', defaultWebsiteId);
//   					if(source == 'Web ('+defaultWebsite.getFieldValue('displayname')+')')
//   						newLeadSource = nlapiGetContext().getSetting('SCRIPT', 'custscript_nbs272_media_code');
//   				}
//   			}
//   			
//   		}
//   		if(!!newLeadSource)
//   			nlapiSubmitField(nlapiGetRecordType(), nlapiGetRecordId(), 'leadsource', newLeadSource);
////   			currentRecord.setFieldValue('leadsource', newLeadSource);
//   	}
////   	nlapiSubmitRecord(currentRecord);
//}

function userEventBeforeSubmit(type){
	
	var currentRecord = nlapiGetNewRecord();
   	var leadSource = currentRecord.getFieldValue('leadsource');
   	
   	//1.1
	var configId = nlapiGetContext().getSetting('SCRIPT','custscript_nbs272_mc_config_2');		
	
	if(!!configId)
	{
		var config = nlapiLookupField('customrecord_nbs330_media_code_config',configId,['custrecord_nbs330_catdefaultmediacode','custrecord_nbs330_media_code','custrecord_nbs330_welcomepackmc']);
	}
   	
   	if(!(!!leadSource)){
   		var newLeadSource = ''; 
   		var promotionId = currentRecord.getLineItemValue('promotions', 'promocode', 1);
   		if(!!promotionId){
   			var promotion = nlapiLoadRecord('promotioncode', promotionId);
	   		newLeadSource = promotion.getFieldValue('custrecord_nbs_leadsource');
   		}else{
   			var defaultWebsiteId = nlapiGetContext().getSetting('SCRIPT', 'INTERNALWEBSITE');
   			if(!!defaultWebsiteId){
   				if (nlapiGetContext().getExecutionContext() == 'webstore') {
   					//newLeadSource = nlapiGetContext().getSetting('SCRIPT', 'custscript_nbs272_media_code');
   					newLeadSource = config.custrecord_nbs330_media_code || '';		//1.1
   				}
   			}
   		}
   		if(!!newLeadSource) {
   			currentRecord.setFieldValue('leadsource', newLeadSource);
            var campaign = nlapiLoadRecord('campaign', newLeadSource);
			var channel = campaign.getFieldValue('custevent_nbs_channel');
			if(!!channel){
				currentRecord.setFieldValue('class', channel);
			}
			var entityId = currentRecord.getFieldValue('entity');
			var custLeadSource = nlapiLookupField('customer', entityId, 'leadsource');
			if(!(!!custLeadSource))
				nlapiSubmitField('customer', entityId, 'leadsource', newLeadSource);
   		}
   	}else{
      		currentRecord.setFieldValue('leadsource', leadSource);
            var campaign = nlapiLoadRecord('campaign', leadSource);
			var channel = campaign.getFieldValue('custevent_nbs_channel');
			if(!!channel){
				currentRecord.setFieldValue('class', channel);
			}
    }
}