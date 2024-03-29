'use strict';

/**
 * Entry point of the web extension (addon) picIT
 */
try {
	const picIT = new PicIT(
			browser.i18n.getMessage("extensionName") + "_context"
			);

	// register context menu
	browser.contextMenus.create(picIT.contextMenu);

	// handle context menu event
	browser.contextMenus.onClicked.addListener(picIT.contextMenuHandler());

	// regsiter connection listener/
	browser.runtime.onConnect.addListener(picIT.connected());

} catch (exception) {
	console.error("PicIT.init: \r\n" + JSON.stringify(exception)+"\r\n"+exception);
}