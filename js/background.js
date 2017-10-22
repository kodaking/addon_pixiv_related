(() => {
	
	function send (id) {

		return chrome.tabs.sendMessage(id, {type: 'onActivated'});
	}

	chrome.tabs.onActivated.addListener((info) => {
		return send(info.tabId);
	});

	chrome.tabs.onUpdated.addListener((id, info) => {
		if (info.status === 'complete') {
			send(id);
		}
	});
})();