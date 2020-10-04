/**
 * Entry point of the pageAction popup open call
 */
"use strict";

/**
 * init the popup
 */
function init() {
  // call for user confirmation the usage warnings
  browser.storage.local.get("warning").then(handleWarning, handleNoWarning);
}

/**
 * Handle the case that the user didn't read the usage warning or declined it
 * @param declined boolean (false: didn't read, true: declined)
 */
function handleNoWarning(declined) {
  try {
    // setup declined popup
    const popupWarning = new WarningPopup(init);
    popupWarning.show(declined);
    
  } catch (exception) {
    console.error(
      "PicIT.pageAction.handleNoWarning: " + JSON.stringify(exception)
    );
  }
}

/**
 * Handle the case an confirmation (wether accept or deny) of the user was found
 * @param value storage value about confirmation
 */
function handleWarning(value) {
  try {
    if (
      value === undefined ||
      value.warning === undefined ||
      value.warning.value === undefined
    ) {
      // user never read warning
      handleNoWarning(false);
    } else if (value.warning.value === "declined") {
      // user read warning but declined it
      handleNoWarning(true);
    } else if (value.warning.value === "accepted") {
      //user accepted the warning
      const popupQRCode = new QRCodePopup();
      popupQRCode.show();
      popupQRCode.connect();
    } else {
      onError(value);
    }
  } catch (exception) {
    console.error(
      "PicIT.pageAction.handleWarning(" +
        JSON.stringify(value) +
        "): " +
        JSON.stringify(exception)
    );
  }
}

/**
 * Log any error
 */
function onError(event = "empty") {
  console.error("PicIT.pageAction: " + JSON.stringify(event));
}

/**
 * Entry point of the pageAction popup
 */
init();
