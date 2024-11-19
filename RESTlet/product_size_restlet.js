/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/record', 'N/error', 'N/search'],
    (record, error, search) => {
 

    const get = (payload) => {
        _validatePayLoad(payload);
            itemSKU = payload.sku;
            log.debug ('REQUESTED SKU', itemSKU)
        const itemSize = _getItemSize(itemSKU);
        log.debug ('ITEM SIZE', itemSize);
        if (!itemSize){
            _throwError('SKU_NOT_FOUND', 'SKU was not found');
        }
        return itemSize;
    }

    const _validatePayLoad = (payload) => {
        if(!payload.sku){
        _throwError('NO_SKU_PROVIDED', 'SKU is required');
        }
    }

    const _getItemSize = (itemSKU) => {
        let itemInternalId = '';
        search.create({
            type: search.Type.ITEM,
            filters: ['externalid', 'is', itemSKU],
            columns: ['custitem_sp_dimensions']
        }).run().each(result => {
            log.debug ('RESULT', result)
            itemSizeField = result.getValue("custitem_sp_dimensions")
        })

        log.debug('FOUND ITEM SIZE', itemSizeField)  
        var firstX = itemSizeField.indexOf("x");
        var itemHeight = itemSizeField.substr(0,firstX);
        return itemHeight;
    }




    const _throwError = (errorCode, errorMessage) => {
        const error = new Error(errorMessage);
        error.name = errorCode;
        throw error;
    }

    return {get}

}); 