(function () {

	var transparencyCutoff = 200;
	var transparent = true;
	var headerElement = document.getElementsByTagName('header')[0];
	var transparentClassName = 'transparent';

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

	function setHeaderTransparency() {
		var distanceFromTop = window.pageYOffset;

		if (distanceFromTop > transparencyCutoff && transparent === true) {
			removeHeaderTransparency();

		} else if (distanceFromTop <= transparencyCutoff && transparent === false) {
			addHeaderTransparency();
		}
	}

	addHeaderTransparency();
	setHeaderTransparency();
	document.onscroll = function() {
		setHeaderTransparency();
	};

})();