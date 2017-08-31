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
	registerDialog('select-num-users');
	registerDialog('branding-tool');
	registerDialog('incremental-pricing-confirmation');

})();

// Accordion
// Converts the HTML structure:
// "h2 + p + p + h2 + p + p",
// as created by kramdown, into
// "label(>h2) + input[checkbox] + div(>p)",
// so that it can be styled to act as an accordion while
// maintaining kramdown compatibility for editing.
(function () {

	var titleTag = 'h2';
	var contentTag = 'P';

	function getSiblings(el) {

		// If there is a next element, and it is a P tag...
		if (el.nextElementSibling !== null && el.nextElementSibling.tagName === contentTag) {

			// Create a list
			var thisElementSibling = [];

			// Add the first sibling to the list
			thisElementSibling.push(el.nextElementSibling);

			// Get the first sibling's siblings
			var followingElementSiblings = getSiblings(el.nextElementSibling);

			// Add the two lists of siblings together
			var elementSiblings = thisElementSibling.concat(followingElementSiblings);

			// Return the list of siblings
			return elementSiblings;


		} else {
			return [];
		}
	}

	var targetArea = document.querySelector('.text-content.accordion');

	if (targetArea !== null) {

		var titleElements = targetArea.querySelectorAll(titleTag);

		for (var i = 0; i < titleElements.length; i++) {

			var titleElement = titleElements[i];

			// Get a list of the content elements
			var contentElements = getSiblings(titleElements[i]);

			// Create a div after the title
			var contentWrapper = document.createElement('div');
			titleElement.parentNode.insertBefore(contentWrapper, titleElement.nextSibling);

			// Create a checkbox element
			var checkbox = document.createElement('input');
			checkbox.setAttribute('type' , 'checkbox');
			checkbox.setAttribute('name' , 'accordion');
			checkbox.setAttribute('id'   , 'accordion' + i);
			checkbox.setAttribute('value', i);
			titleElement.parentNode.insertBefore(checkbox, titleElement);

			// Move the content into the contentWrapper
			for (var j = 0; j < contentElements.length; j++) {
				contentWrapper.appendChild(contentElements[j]);
			}

			// Make the title into a label for the checkbox
			var labelTitle = document.createElement('label');
			labelTitle.setAttribute('for', 'accordion' + i);
			titleElement.parentNode.insertBefore(labelTitle, titleElement.nextSibling);
			labelTitle.appendChild(titleElement);


			// console.log(titleElement);
			// console.log(contentElements);
			// console.log(contentWrapper);

		}
	}

})();


// Branding tool
(function () {

	/**
	 * Checks is an email address is valid
	 * @param  {string} - email address input by the user
	 * @return {bool} - true if valid, false if invalid
	 */
	function emailValid(email) { 
		var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
		return re.test(email);
	}

	// For all branding forms on a page...
	var brandingForms = document.querySelectorAll('.branding-form');

	for (var i = 0; i < brandingForms.length; i++) {

		// When clicking the 'reveal-branding-form' button,
		// focus the input field (which, in this case, is the next element).
		brandingForms[i].querySelector('.reveal-branding-form').addEventListener('click', function(event){
			this.nextElementSibling.focus();
		});

		// When the user tries to submit...
		brandingForms[i].addEventListener('submit', function(event) {

			// Prevent the submission
			event.preventDefault();

			// Get the value of the email
			var email = this.querySelector('.card-email').value;

			// If the email is valid, submit it.
			if (emailValid(email)) {
				mixpanel.track('Branding Tool submitted', {email: email});
				this.submit();
				return true;

			// If email is invalid,
			// display an error message in the 'error-message' element.
			} else {

				var message = '\'' + email + '\' is not a valid email address.';

				var snackbarContainer = this.querySelector('.mdl-snackbar');
				snackbarContainer.MaterialSnackbar.showSnackbar({
					message: message,
					timeout: 7500,
				});

				return false;
			}

		}, false);

	}

})();