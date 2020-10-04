/**
 * Entry point of the web extension
 */
try {
	
  const extension = new PicIT(
    browser.i18n.getMessage("extensionName") + "_context"
  );

  /** register context menu */
  browser.contextMenus.create(extension.contextMenu);

  /** handle context menu event */
  browser.contextMenus.onClicked.addListener(extension.contextMenuHandler());

  /** regsiter connection listener */
  browser.runtime.onConnect.addListener(extension.connected());
} catch (exception) {
  console.error("PicIT.init: " + JSON.stringify(exception));
}
