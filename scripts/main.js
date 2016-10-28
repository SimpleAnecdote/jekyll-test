// Header transparency
(function () {

	var transparencyCutoff = 200;
	var transparent = true;
	var headerElement = document.querySelector('.transparent-header header');
	var transparentClassName = 'transparent';
	var initialTransparencyClassName = 'start-transparent';

	// function hasClass(el, className) {
	// 	if (el.classList) {
	// 		return el.classList.contains(className);		
	// 	} else {
	// 	return !!el.className.match(new RegExp('(\\s|^)' + className + '(\\s|$)'));		
	// 	}
	// }

	function addClass(el, className) {
		if (el.classList) {
			el.classList.add(className);
		} else if (!hasClass(el, className)) {
			el.className += " " + className;
		}
	}

	function removeClass(el, className) {
		if (el.classList) {
			el.classList.remove(className);
		} else if (hasClass(el, className)) {
			var reg = new RegExp('(\\s|^)' + className + '(\\s|$)');
			el.className=el.className.replace(reg, ' ');
		}
	}

	function addHeaderTransparency() {
		transparent = true;
		addClass(headerElement, transparentClassName);
	}

	function removeHeaderTransparency() {
		transparent = false;
		removeClass(headerElement, transparentClassName);
	}

	function removeInitialTransparency() {
		removeClass(headerElement, initialTransparencyClassName);
	}

	function setHeaderTransparency() {
		var distanceFromTop = window.pageYOffset;

		if (distanceFromTop > transparencyCutoff && transparent === true) {
			removeHeaderTransparency();

		} else if (distanceFromTop <= transparencyCutoff && transparent === false) {
			addHeaderTransparency();
		}
	}

	if (headerElement !== null && headerElement !== undefined) {
		addHeaderTransparency();
		setHeaderTransparency();
		removeInitialTransparency();
		document.onscroll = function() {
			setHeaderTransparency();
		};
	}

})();


// Dialogs
(function () {

	function registerDialog(dialogId) {

		// Close dialog
		var closeDialog = function(event) {
			dialog.close();
			event.preventDefault();
		};

		// Open dialog
		var openDialog = function(event) {
			dialog.showModal();
			document.querySelector('.backdrop').addEventListener('click', closeDialog, false);
			event.preventDefault();
		};

		// Get the dialog object,
		// and use use the polyfill to ensure it's ready to function
		// (Note: forcing the polyfill so we can support close on click outside).
		var dialog = document.querySelector('dialog#' + dialogId);
		dialogPolyfill.forceRegisterDialog(dialog);

		// Get the buttons that open & close this dialog
		var showDialogButtons = document.querySelectorAll('[href="#' + dialogId + '-open"]');
		var closeDialogButtons = dialog.querySelectorAll('.close');


		var i = 0;

		// Set dialog to open when open dialog buttons are clicked.
		for (i = 0; i < showDialogButtons.length; i++) {
			showDialogButtons[i].addEventListener('click', openDialog, false);
		}

		// Set dialog to close when close dialog buttons are clicked.
		for (i = 0; i < closeDialogButtons.length; i++) {
			closeDialogButtons[i].addEventListener('click', closeDialog, false);
		}

	}

	registerDialog('app-download');

})();