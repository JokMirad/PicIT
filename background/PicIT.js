"use strict";

/**
 * Background page
 *
 * The page register the context menu for the browser content.
 * It setup an event handler for the context menu.
 * The backgroud page opens a bidirectional communication port
 * and listen for popup.
 *
 * @type type
 */
class PicIT {
  constructor(extensionName) {
    /**
     * constant id of the menu we listen to
     */
    this._MENU_ID = extensionName;

    /** text from content page that was purified / sanitized
     */
    this._secureText = undefined;

    /**
     * bidirectional communication to pageAction popup
     */
    this._portPopup = undefined;

    /**
     * The context menu properties
     */
    this._contextMenu = {
      id: this._MENU_ID,
      title: browser.i18n.getMessage("extensionMenuName"),
      contexts: ["link", "selection", "image", "audio", "video"],
    };
  }

  /**
   * Closure to handle context menu click event
   * @returns {Function}
   */
  contextMenuHandler() {
    const self = this;
    return (info, tab) => {
      if (info.menuItemId === self._MENU_ID) {
        let text;
        if (info.srcUrl !== undefined) {
          text = info.srcUrl;
        } else if (info.linkUrl !== undefined) {
          text = info.linkUrl;
        } else if (info.selectionText !== undefined) {
          text = info.selectionText;
        }

        self._secureText = DOMPurify.sanitize(text);

        browser.pageAction.openPopup();
      }
    };
  }

  /**
   * Closure to handle connected event on commonication port
   * @returns {Function}
   */
  connected() {
    const self = this;

    return (port) => {
      if (
        self._portPopup !== undefined &&
        self._portPopup.onMessage.hasListener()
      ) {
        self._portPopup.onMessage.removeListener(self.messageHandler());
      }
      self._portPopup = port;

      /** register message handler */
      self._portPopup.onMessage.addListener(self.messageHandler());
    };
  }

  /**
   * Closure to handle messages on the communication port
   * @returns {Function}
   */
  messageHandler() {
    const self = this;

    return (event) => {
      /** check if we still know _secureText: send text or empty hi */
      let content = undefined;

      if (self._portPopup !== undefined) {
        if (event.who === "popup" && self._secureText !== undefined) {
          content = self._secureText;
          self._secureText = undefined;
        }

        self._portPopup.postMessage({
          who: "PicIT",
          content: content,
        });
      }
    };
  }
}
