var environment = "";

$(document).ready(function() {

	preloadImages();

	var brandMaker;

	var email = getParameterByName('email');

	brandMaker = new BrandMaker();
	brandMaker.initialize(email);
	brandMaker.open();

});

function getParameterByName(name, url) {
    if (!url) {
      url = window.location.href;
    }
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

/**
 * Brandmaker manages the UI/UX of the brand maker flow.
 * Contains instances of brand maker sub-pages, and handles
 * common data between these pages.
 */
function BrandMaker() {

	this.scannedCard;       // Card returned from the input email address.
	this.resultCard;        // Whatever card results from the brandMaker flow
	this.coverImagesPage;   // Instance of CoverImagesPage
	this.colorPalettesPage; // Instance of CoverPalettesPage
	this.resultPage;        // Instance of ResultPage
	this.postClaimPage;     // Instance of PostClaimPage
	this.email;             // Email address the user started the brand maker with
	this.brandingSuccess;   // True when the user has created a brand in this process


	/**
	 * Sets up the brandMaker UI in a default state,
	 * and initializes it's child pages.
	 * Also begins request for the initial card,
	 * based in the user email.
	 * @email - The email address for the card entered by the user
	 */
	this.initialize = function(email) {

		// Initialize some pages & values
		this.email = email;
		this.resultPage = new ResultPage(this);
		this.postClaimPage = new PostClaimPage(this);

		// Get the scanned card of the entered email.
		this.getScannedCard();

		// Add the close button.
		var closeButton = $($.parseHTML("<button type='button' class='overHeaderButton' id='closeBrandMaker'></button>"));
		$("#brandMaker").append(closeButton);
		var brandMaker = this;
		closeButton.on("click", function() {
			window.history.back();
		});

		// Add loading indicator
		var string = 
			"<div class='loadingIndicator'>" +
				"<img class='loadingImage' src='images/icons/loadingSpinner.gif'>" +
				"<p>Generating your card</p>" +
			"</div>";
		var loadingIndicator = $($.parseHTML(string));
		$("#brandMaker").append(loadingIndicator);
	}

	/**
	 * Opens the brandMaker lighbox for the user to see.
	 * Hides the other content on the homepage.
	 */
	this.open = function() {
		// Animate brand maker in
		$("#brandMaker").css("position", "fixed");
		$("#brandMaker").fadeIn(250, function() {

			// Remove homepage content when fade completes.
			$("#content").hide();
			$("#brandMaker").css("position", "");
		});
	}

	/**
	 * Sends the result of the branding process to the server.
	 * If the process was a success, sends the selected brand.
	 * If the process was a failure, sends that it was.
	 * Should only be used if the branding process was not skipped automatically
	 * (ie the card was already branded).
	 */
	this.sendBrandingResult = function() {

		var brandMaker = this;
		var itemId = this.resultCard.biBarcodeId;

		// If the branding was a success, submit the brand.
		if (this.brandingSuccess) {
			var coverImageId = this.resultCard.coverImage.biCoverImageId;
			var coverImageColourPaletteId = this.resultCard.colorPalette.biCoverImageColourPaletteId;
			var url = 'https://' + environment + 'api.thehaystackapp.com/1.0/images/coverImagesColourPalettesWeb/' + itemId + '|' + coverImageId + '|' + coverImageColourPaletteId + '.json';

		// Else, report that it was not.
		} else {
			var url = 'https://' + environment + 'api.thehaystackapp.com/1.0/images/coverImagesNoAppropriateImageWeb/' + itemId + '.json';
		}

		// Send the branding result
		$.ajax({
			type: 'POST',
			url: url,
			contentType: 'application/json',
			dataType: 'json',
			headers: {
				// UserAgent: "Haystack/1; Web/Homepage; " + window.navigator.userAgent
			}
		})
		.always(function(data) {
		})

		// If the request failed...
		.fail(function(data) {
			// draw a fail state.
			brandMaker.resultPage.drawFailState();
		})
		.done(function(data) {

			switch(data.Status) {

				// If the brand submission succeeeds...
				case 200:
					// Render the result page content for the user.
					brandMaker.resultPage.drawPageContentElement();
				break;

				// If it did not succeed...
				default:
					// Draw a failstate
					brandMaker.resultPage.drawFailState();
				break;
			}

		});
	}

	/**
	 * Start the branding process for the user.
	 * Should be called only when a scannedCard has been retrieved.
	 * Initializes the coverImages & coverPalettes pages,
	 * and starts their requests.
	 */
	this.startBrandingProcess = function() {

		// Create the pages
		this.coverImagesPage = new CoverImagesPage(this);
		this.colorPalettesPage = new ColorPalettesPage(this);

		// Start their requests for data
		this.coverImagesPage.getCoverImagesData();
		this.colorPalettesPage.getCoverImagesColorPalettes();

		// Draw the coverImagesPage (first page),
		// and turn to it.
		this.coverImagesPage.drawPageElement();
		this.changePageTo(this.coverImagesPage.pageElement);
	}

	/**
	 * The logic to be executed when the scannedCard has been
	 * succesfully retrieved. Contains the UX flow determined
	 * by the type of card recieved.
	 */
	this.scannedCardRetrieved = function() {

		// Remove the card loading indicator
		$("#brandMaker > .loadingIndicator").remove();

		// Execute the flow determined by the type of card recieved.
		switch(this.scannedCard.EligibleForBrandingEnum) {

			// Card ready to be branded.
			case 0:
				// Start the branding process.
				this.startBrandingProcess();
			break;

			// Error.
			case 1:
			break;

			// Generic email - unbrandable
			case 2:
				// Result card is scanned card since cannot be branded.
				// Display that as the result.
				this.resultCard = this.scannedCard;
				this.displayResult();
			break;

			// Already branded.
			case 3:
				// Result card is scanned card since is already branded.
				// Display that as the result.
				this.resultCard = this.scannedCard;
				this.displayResult();
			break;
		}
	}

	/**
	 * Determines what kind of card the resultCard is
	 * @return {int} resultType
	 * 0 - Unclaimed, Branded
	 * 1 - Unclaimed, Unbranded
	 * 2 - Claimed
	 */
	this.getResultType = function() {

		var resultType;

		// If the card is unclaimed...
		if (this.resultCard.bClaimed === 0) {

			// If it is branded, claim card button.
			if(this.resultCard.isBranded) {				
				resultType = 0;

			// If it is unbranded, download prompts + text
			} else {
				resultType = 1;
			}

		// If it is claimed (or undefined)...
		} else {

			// With download prompts + text
			resultType = 2;
		}

		return resultType;
	}

	/**
	 * Displays the resultPage, width appropriate
	 * resultCard and UI.
	 */
	this.displayResult = function() {
		// Draw the frame of the page
		this.resultPage.drawPageElement();
		// Draw the content of the page
		this.resultPage.drawPageContentElement();
		// Turn to this page
		this.changePageTo(this.resultPage.pageElement);
	}

	/**
	 * Get the card from the server based on the
	 * email address the user input,
	 * and set it as this.scannedCard
	 * Upon success, executes UX logic reliant on the scanned card.
	 */
	this.getScannedCard = function() {

		var brandMaker = this;

		$.ajax({
			type: 'POST',
			url: 'https://' + environment + 'api.thehaystackapp.com/1.0/data/scan.json',
			contentType: 'application/json',
			dataType: 'json',
			headers: {
				// UserAgent: "Haystack/1; Web/Homepage; " + window.navigator.userAgent
			},
			data: JSON.stringify({
				Action: "GetOrCreateItemFromRegularScanReturnItemWeb",
				BodyDetails: {
					EmailsArray: [
						brandMaker.email
					],
					CoverImageQuantity: 9,
					MarkAsScanned: 1,
					CreateUnderUser: 0,
					SendClaim: 0
				}
			})
		})
		.always(function(data) {
		})
		// If the request failed...
		.fail(function(data) {
			// Display a fail state.
			brandMaker.drawFailState();
		})
		.done(function(data) {
			
			switch(data.Status) {

				// If card received, store and continue.
				case 200:
					// Create a HaystackCard from data recieved,
					// and store it as scannedCard
					brandMaker.scannedCard = new HaystackCard({
						details: data.Details[0]
					});
					// Execute UX logic that can now be run with scannedCard
					brandMaker.scannedCardRetrieved();
				break;

				// If something went wrong...
				default:
					brandMaker.drawFailState();
				break;
			}
		});
	}

	/**
	 * Resets the #brandMaker element to it's
	 * default state
	 */
	this.reset = function() {
		$(".brandMakerPage").fadeOut();
		$(".active").removeClass("active");
		$("#brandMaker").empty();
		$("#brandMaker").removeClass("postClaim");
	}

	/**
	 * Closes the brandMaker UI
	 */
	this.close = function() {
		$("#brandMaker").css("position", "fixed");
		$("#content").show();
		var brandMaker = this;
		$("#brandMaker").fadeOut(250, function() {
			brandMaker.reset();
			$("#brandMaker").css({
				"position" : "",
				"display"  : "",
				"opacity"  : "",
			});
			$("brandMaker").removeAttr("style");
		});
		$(window).scrollTop(0);
		window.scrollTo(0,0);
	}

	/**
	 * Draws a fail state fro the user,
	 * for when a scannedCard request fails.
	 */
	this.drawFailState = function() {

		var pageElement = $("#brandMaker");

		// Create fail state element
		$(".loadingIndicator", pageElement).remove();
		var string = 
		"<div class='failDialog'>" +
			"<p>Woops... couldn't reach the Haystack server.</p>" +
			"<button class='fat retry'>Try again</button>" +
		"</div>";
		var failDialog = $($.parseHTML(string));
		pageElement.append(failDialog);

		// Retry button event handler
		var brandMaker = this;
		$("button", failDialog).on("click", function(e) {
			// Restart the brandMaker
			pageElement.empty();
			brandMaker.initialize(brandMaker.email);
		});
	}

	/**
	 * Changes the page of the brandMaker from whatever page it is currently on,
	 * to the page requested.
	 * @param  {DOM object} page - the pageElement of a brandMaker page object.
	 */
	this.changePageTo = function(page) {

		// Get the currently active page
		var activePage = $(".brandMakerPage.active");

		// If there is no currently active page...
		if (activePage.length == 0) {

			// Ensure page is at top...
			page.scrollTop(0);
			window.scrollTo(0, 0);
			// Set page to active...
			page.addClass("active");
			// Display the page...
			page.fadeIn(250);

		// If there is an active page, and it not the page
		// we're trying to change to...
		} else if (activePage[0] != page[0]) {

			// Hide the active page, and when hidden...
			activePage.fadeOut(250, function(){

				// Set the currently active page as inactive...
				activePage.removeClass("active");
				// Ensure page is at top...
				page.scrollTop(0);
				window.scrollTo(0, 0);
				// Set page to active...
				page.addClass("active");
				// Display the page...
				page.fadeIn(250);
			});
		}
	}
}


/**
 * Object representing the brandMaker page where
 * the user selects their coverImage of choice.
 * @param {BrandMaker} brandMaker - this pages's parent brandMaker.
 */
function CoverImagesPage(brandMaker) {

	this.coverImages = Array();         // Array that stores fully retrieved coverImages
	this.iCoverImagesQuantityFound = 0; // Number of coverImages the server claims will be returned.
	this.numDrawnCoverImages = 0;       // Number of coverImages either drawn or queued to be drawn in the UI.
	this.pageUninitilized = true;       // If the page UI has not yet been drawn & revealed to the user.
	this.pageElement;                   // Element that is, and contains, this page's UI.
	this.pageContentElement;            // The interactive content of this page.
	this.currentRetry = 0;              // Which retry the getCoverImagesData function is up to.
	this.maxRetries = 20;               // The maximum number of retries getCoverImagesData can execute, before failing.

	/**
	 * Draws the container element for this page
	 */
	this.drawPageElement = function() {

		var string =
		"<div id='logoPreviewPage' class='brandMakerPage'>" +
			"<div class='loadingIndicator'>" +
				"<img class='loadingImage' src='images/icons/loadingSpinner.gif'>" +
				"<p>Retrieving logos</p>" +
			"</div>" +
		"</div>";

		this.pageElement = $($.parseHTML(string));
		$("#brandMaker").append(this.pageElement);
	}

	/**
	 * Function for use when there is no appropriate coverImage for this brand,
	 * as determined automatically or by the user.
	 * Sets the branding process as a failure, tells the server,
	 * and turns to the resultPage.
	 */
	this.logoIsntHere = function() {
		brandMaker.resultCard = brandMaker.scannedCard;
		brandMaker.brandingSuccess = false;
		brandMaker.sendBrandingResult();
		brandMaker.resultPage.drawPageElement();
		brandMaker.changePageTo(brandMaker.resultPage.pageElement);
	}

	/**
	 * Draws the internal UI & content of this page.
	 */
	this.drawPageContentElement = function() {

		// Create the page content
		var string =
		"<div id='logoPreviewContent' class='pageContent'>" +
			"<h2>Choose a logo.</h2>" +
			"<div id='logoPreviews'></div>" +
			"<button class='fat'>My logo isn't here</button>" +
		"</div>";
		this.pageContentElement = $($.parseHTML(string));
		
		// Add it to the page, replacing what is already there.
		this.pageElement.empty();
		this.pageElement.append(this.pageContentElement);
		this.pageContentElement.fadeIn();

		// Event handler for "My logo isn't here" button
		var coverImagesPage = this;
		$("button", this.pageContentElement).on("click", function(e) {
			coverImagesPage.logoIsntHere();
		});

		// Draw placeholders for all the cover images to come.
		this.drawCoverImagePlaceholders($("#logoPreviews"));

		// Set uninitialized to false (because the UI & images have started displaying)
		this.pageUninitilized = false;
	}

	/**
	 * Draws placeholder elements for the coverImages,
	 * while their details are retrieved from the server.
	 * @param  {element} destination - element to draw these placeholders in.
	 */
	this.drawCoverImagePlaceholders = function(destination) {

		// For each coverImage the server claims it will return, draw a placeholder.
		for (var i = 0; i < this.iCoverImagesQuantityFound; i++) {
			destination.append($($.parseHTML("<div class='logoPlaceholder'></div>")));
		}
	}

	/**
	 * Remove this page from the brandMaker element,
	 * resetting it to as it was before creation.
	 */
	this.destruct = function() {

		this.pageElement.remove();
	}

	/**
	 * Sets the coverImages array from the accumulated retrieved coverImage data.
	 * @param {object} coverImagesRawData - the coverImage data recieved
	 * from a getCoverImagesData request
	 */
	this.setCoverImages = function(coverImagesRawData) {

		// Set the number of images to be returned from the server (in total).
		this.iCoverImagesQuantityFound = coverImagesRawData.iCoverImagesQuantityFound;

		var coverImagesData = coverImagesRawData.CoverImages;

		// For each cover image returned from the server so far...
		for (var i = 0; i < coverImagesData.length; i++) {

			// If it has a url and is not already in the list...
			if (coverImagesData[i].CoverImagePath != "" && !this.coverImagePresent(coverImagesData[i])) {

				// Add it as an object to the coverImages array.
				var coverImage = new CoverImage(coverImagesData[i]);
				this.coverImages.push(coverImage);
			}
		}
	}

	/**
	 * Change the parent brandMaker to this page.
	 */
	this.changeTo = function() {
		// Ensure transform animations are at default.
		$("#logoPreviews .logoPreview").css("transform", "");

		brandMaker.changePageTo($("#logoPreviewPage"));
	}

	/**
	 * Determines if a coverImage has yet been added to the coverImages array.
	 * @param  {coverImage} - CoverImage object to check if is present in coverImages array.
	 * @return {bool} - true if present, false if missing.
	 */
	this.coverImagePresent = function(coverImage) {
		for (var j = 0; j < this.coverImages.length; j++) {
			if (coverImage.biCoverImageId == this.coverImages[j].biCoverImageId) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Draw the undrawn coverImages to the coverImagesPage,
	 * and create their event handlers.
	 * @param  {element} destination - element to draw these coverImages in.
	 */
	this.drawCoverImages = function(destination) {

		// For each coverImage in coverImages that has not yet been drawn...
		for (var i = this.numDrawnCoverImages; i < this.coverImages.length; i++) {

			// Get the HTML element for this coverImage
			var logoPreview = this.coverImages[i].getHTML();

			// Find the first placeholder, and replace it with this coverImage
			$(".logoPlaceholder", destination).first().replaceWith(logoPreview);

			// Event handler for coverImages (on click)
			var coverImagesPage = this;
			logoPreview.on("click", function() {

				// Get the ID of the coverImage element
				var biCoverImageId = $(this).attr("id");

				// Get the matching coverImage object from the ID
				var coverImage = coverImagesPage.getCoverImageFrombiCoverImageId(biCoverImageId);

				// Select this coverImage for the colorPalettes page,
				// and start it's logic there.
				brandMaker.colorPalettesPage.selectCoverImage(coverImage);

				// Animate out the cover images
				$(".logoPreview").not(this).css("transform", "scale(0)");
				$(this).css("transform", "scale(1.5)");

			});
		}

		this.numDrawnCoverImages = this.coverImages.length;
	}

	/**
	 * Draws a fail state for when getCoverImagesData fails
	 */
	this.drawFailState = function() {

		// Create fail state element
		this.pageElement.empty();
		var string = 
		"<div class='failDialog'>" +
			"<p>Woops... couldn't reach the Haystack server.</p>" +
			"<button class='fat retry'>Try again</button>" +
		"</div>";
		var failDialog = $($.parseHTML(string));
		this.pageElement.append(failDialog);

		// Retry button event handler
		var coverImagesPage = this;
		$("button", failDialog).on("click", function(e) {

			// Restart the branding process
			coverImagesPage.destruct();
			brandMaker.startBrandingProcess();
		});
	}

	/**
	 * Hides any placeholders that are still remaining - for use upon request failure,
	 * or when iCoverImagesQuantityFound proves inaccurate.
	 */
	this.hideUnloadedPlaceholders = function() {

		// Fade out & crush width of placeholders
		var logoPlaceholders = $(".logoPlaceholder");
		logoPlaceholders.animate({
			'width': '0px'
		}, 1000);
		logoPlaceholders.fadeOut(1000);
	}

	/**
	 * Returns the coverImage object that has a given biCoverImageId
	 * @param  {int} biCoverImageId - ID of the sought coverImage
	 * @return {coverImage} - the sought coverImage
	 */
	this.getCoverImageFrombiCoverImageId = function(biCoverImageId) {
		for (var i = 0; i < this.coverImages.length; i++) {
			if (this.coverImages[i].biCoverImageId == biCoverImageId) {
				return this.coverImages[i];
			}
		}
	}

	/**
	 * Retrieves coverImages data, and executes UI logic resulting
	 * from the incremental retrieval of individual coverImage data.
	 * (ie adds coverImages one by one to the page, as they come in)
	 */
	this.getCoverImagesData = function() {

		var coverImagesPage = this;

		// If this retry will not exceed the maxRetries...
		if (coverImagesPage.maxRetries === undefined ||
			coverImagesPage.currentRetry < coverImagesPage.maxRetries) {

			// Request coverImages data from the server.
			$.ajax({
				type: 'GET',
				url: 'https://' + environment + 'api.thehaystackapp.com/1.0/images/coverImagesWeb/' + brandMaker.scannedCard.biBarcodeId + '|Haystack|High.json',
				// url: 'https://' + environment + 'api.thehaystackapp.com/1.0/images/coverImages/' + brandMaker.scannedCard.biBarcodeId + '|Haystack|High.json',
				contentType: 'application/json',
				dataType: 'json',
				headers: {
					// UserAgent: "Haystack/1; Web/Homepage; " + window.navigator.userAgent
				}
			})
			.always(function(data) {
			})

			// If request fails, increment retry counter, then retry.
			.fail(function(data) {
				coverImagesPage.currentRetry++;
				coverImagesPage.getCoverImagesData();
			})

			// If request succeeds...
			.done(function(data, textStatus, resp) {

				// Set the retry time & max retries.
				var retryTime = resp.getResponseHeader('Retry-After') * 1000;
				coverImagesPage.maxRetries = resp.getResponseHeader('X-Haystack-Max-Retries');

				switch(data.Status) {

					// If there is no useful data to return yet...
					case 202:
						setTimeout(function() {

							// increment retry counter, then retry.
							coverImagesPage.currentRetry++;
							coverImagesPage.getCoverImagesData();

						}, retryTime);
					break;

					// If partially complete data is returned...
					case 206:
						setTimeout(function() {

							// If at least some cover images have been returned from the server...
							if (data.Details.CoverImages !== undefined) {

								// Store these coverImages in the coverImages array.
								coverImagesPage.setCoverImages(data.Details);

								// If the page UI has not yet been displayed, display it.
								if (coverImagesPage.pageUninitilized) {
									coverImagesPage.drawPageContentElement();
								}

								// Draw the undrawn coverImages for the user.
								coverImagesPage.drawCoverImages($("#logoPreviews"));
							}

							// Increment retry counter, then retry for more coverImages
							coverImagesPage.currentRetry++;
							coverImagesPage.getCoverImagesData();

						}, retryTime);
					break;

					case 200:

						// If the server found no logos for this suffix,
						// automatically fail the branding process, and go straight to resultPage.
						if (data.Details.iCoverImagesQuantityFound === 0) {
							coverImagesPage.logoIsntHere();
						}

						// If at least some cover images have been returned from the server...
						if (data.Details.CoverImages !== undefined) {

							// Store these coverImages in the coverImages array.
							coverImagesPage.setCoverImages(data.Details);

							// If the page UI has not yet been displayed, display it.
							if (coverImagesPage.pageUninitilized) {
								coverImagesPage.drawPageContentElement();
							}

							// Draw the undrawn coverImages for the user.
							coverImagesPage.drawCoverImages($("#logoPreviews"));
						}

						// Hide any unused placeholders, now that the requests have finished
						// and no more coverImages are coming.
						coverImagesPage.hideUnloadedPlaceholders();

						// Reset current retries counter
						coverImagesPage.currentRetry = 0;

					break;

					default:
					break;
				}

			});
		
		// If the request exceeds the maxRetries...
		} else {

			// If the page has yet to be drawn (due to partial data),
			// draw a fail state for the page (with retry option).
			if (coverImagesPage.pageUninitilized) {
				coverImagesPage.drawFailState();

			// If the page has been drawn,
			// hide unloaded image placeholders.
			} else {
				coverImagesPage.hideUnloadedPlaceholders();
			}
		}
	}
}


/**
 * Object representing the brandMaker page where
 * the user selects their colorPalette of choice.
 * @param {BrandMaker} brandMaker - this pages's parent brandMaker.
 */
function ColorPalettesPage(brandMaker) {

	this.coverImagesColorPalettes = Array(); // Array of colorPalette arrays, each being an array of colorPalettes for a coverImage
	this.colorPalettes = Array();            // Array of colorPalettes for each coverImage
	this.selectedCoverImage;                 // coverImage object selected by the user on the CoverImagesPage
	this.selectedCoverImageColorPalettes;    // CoverImageColorPalettes of the selectedCoverImage
	this.pageElement;                        // Element that is, and contains, this page's UI.
	this.pageContentElement;                 // The interactive content of this page.
	this.currentRetry = 0;                   // Which retry the getCoverImagesColorPalettes function is up to.
	this.maxRetries = 20;                    // The maximum number of retries getCoverImagesColorPalettes can execute, before failing.
	this.revealed = false;                   // If the page UI has been drawn & revealed to the user.
	this.requestFailedSilently = false;      // If the getCoverImagesColorPalettes request failed while the user was not actively waiting for a color palette.

	/**
	 * Draws the container element for this page
	 */
	this.drawPageElement = function() {

		var string =
		"<div id='cardPreviewPage' class='brandMakerPage'>" +
			"<div class='loadingIndicator'>" +
				"<img class='loadingImage' src='images/icons/loadingSpinner.gif'>" +
				"<p>Designing your card</p>" +
			"</div>" +
		"</div>";

		this.pageElement = $($.parseHTML(string));
		$("#brandMaker").append(this.pageElement);
	}

	/**
	 * Draws the internal UI & content of this page.
	 */
	this.drawPageContentElement = function() {

		// Createthe content
		var string =
		"<div id='cardPreviewContent' class='pageContent'>" +
			"<button id='reselectLogoHeader' class='overHeaderButton'></button>" +
			"<h2>Pick a card design.</h2>" +
			"<div id='cardPreviews'></div>" +
			"<button id='reselectLogo' class='fat back'>Back</button>" +
		"</div>";
		this.pageContentElement = $($.parseHTML(string));

		// Empty the page, add the content, and show the page.
		this.pageElement.empty();
		this.pageElement.append(this.pageContentElement);
		this.pageContentElement.fadeIn();

		// Event handler for reselect logo buttons
		var colorPallettePage = this;
		$("#cardPreviewPage #reselectLogo, #cardPreviewPage #reselectLogoHeader").on("click", function(e) {

			// Go back to the CoverImagePage, destroying this page.
			brandMaker.coverImagesPage.changeTo();
			colorPallettePage.destruct();
		});
	}

	// 
	/**
	 * Destroys elements & resets object values,
	 * but does NOT clear downloaded palette data.
	 */
	this.destruct = function() {
		this.pageElement.remove();
		this.colorPalettes = Array();
		this.selectedCoverImage = undefined;
		this.selectedCoverImageColorPalettes = undefined;
		this.pageElement = undefined;
		this.pageContentElement = undefined;
		this.currentRetry = 0;
		this.maxRetries = undefined;
		this.revealed = false;
	}

	/**
	 * Destroy this page and start again,
	 * after a total request failure.
	 */
	this.retry = function() {

		// Store selectedCoverImage (to save from destruct)
		var selectedCoverImage = this.selectedCoverImage;

		// Reset this page
		this.destruct();

		// Select the selectedCoverImage, and retry the request.
		this.selectCoverImage(selectedCoverImage);
		this.getCoverImagesColorPalettes();
	}

	/**
	 * Draw the selectedCoverImageColorPalettes if
	 * they are ready, and have not been already.
	 */
	this.tryToReveal = function() {

		// If the user has selected a cover image,
		// and it's color palletes have not yet been drawn...
		var drawnColorPalettes = $("#cardPreviews .haystack-card");
		if (this.selectedCoverImage !== undefined &&
			drawnColorPalettes.length === 0) {

			// If the selected coverImage's color palettes have loaded,
			// draw and display them.
			if (this.selectedCoverImageColorPalettes !== undefined) {
				this.drawPageContentElement();
				this.drawCoverImageColorPalettes();
				this.revealed = true;
			}
		}		
	}

	/**
	 * Create and then turn to the ColorPalettesPage,
	 * then draw palettes for the selectedCoverImage if ready. Retry request if needed.
	 * @param  {coverImage} selectedCoverImage - the coverImage the user wants on their card.
	 */
	this.selectCoverImage = function(coverImage) {

		// Set selectedCoverImage
		this.selectedCoverImage = coverImage;

		// Get and set the colorPalettes for this coverImage
		this.setSelectedCoverImageColorPalettes();

		// Draw and show the page (with a loading screen)
		this.drawPageElement();
		brandMaker.changePageTo(this.pageElement);

		// Draw and reveal the colorPalettes if ready
		this.tryToReveal();

		// If earlier in the background,
		// the color pallette request failed,
		// download them again in case this one is missing.
		if (this.requestFailedSilently) {
			this.requestFailedSilently = false;
			this.getCoverImagesColorPalettes();
		}
	}

	/**
	 * Add coverImagesColorPalettes to the coverImagesColorPalettes array,
	 * that have not yet been added. Set the selectedCoverImageColorPalettes if possible.
	 * @param {object} coverImagesColorPalettesData -
	 * Raw data from the server, containing coverImagesColorPalette data.
	 */
	this.setCoverImagesColorPalettes = function(coverImagesColorPalettesData) {

		// For each colorPalttes returned from the server...
		for (var i = 0; i < coverImagesColorPalettesData.length; i++) {

			// If it is not already in the list...
			if (!this.coverImagesColorPalettePresent(coverImagesColorPalettesData[i])) {

				// Add it to the coverImagesColorPalettes array.
				this.coverImagesColorPalettes.push(coverImagesColorPalettesData[i]);
			}
		}

		// Try to set the selectedCoverImageColorPalettes,
		// in case it was just added to the array above.
		this.setSelectedCoverImageColorPalettes();
	}

	/**
	 * Match a CoverImageColourPaletteId with a ColorPalette,
	 * and return that
	 * @param  {biCoverImageColourPaletteId} - ID of the colorPalette
	 * @return {ColorPalette} - the colorPalette with the input ID
	 */
	this.getColorPaletteFrombiCoverImageColourPaletteId = function(biCoverImageColourPaletteId) {
		for (var i = 0; i < this.colorPalettes.length; i++) {
			if (this.colorPalettes[i].biCoverImageColourPaletteId == biCoverImageColourPaletteId) {
				return this.colorPalettes[i];
			}
		}
	}

	/**
	 * Determines if a coverImagesColorPalette from the raw server data has already
	 * been added to the coverImagesColorPalettes array.
	 * @param  {object} coverImagesColorPaletteData - raw coverImagesColorPalette data from the server.
	 * @return {bool} true if is alrady present in array, false if not present.
	 */
	this.coverImagesColorPalettePresent = function(coverImagesColorPaletteData) {
		for (var i = 0; i < this.coverImagesColorPalettes.length; i++) {
			if (this.coverImagesColorPalettes[i].biCoverImageId == coverImagesColorPaletteData.biCoverImageId) {
				return true;
			}
		}
		return false;
	}

	/**
	 * If a coverImage has been selected, matches a coverImagesColorPalettes
	 * with the selectedCoverImage, and sets it as selectedCoverImageColorPalettes
	 */
	this.setSelectedCoverImageColorPalettes = function() {
		for (var i = 0; i < this.coverImagesColorPalettes.length; i++) {
			if (this.selectedCoverImage &&
				this.selectedCoverImage.biCoverImageId == this.coverImagesColorPalettes[i].biCoverImageId) {
				this.selectedCoverImageColorPalettes = this.coverImagesColorPalettes[i];
			}
		}
	}

	/**
	 * Create colorPalette objects from the selectedCoverImageColorPalettes,
	 * and add them to the colorPalettes array.
	 */
	this.setColorPalettesFromSelectedCoverImageColorPalettes = function() {
		for (var i = 0; i < this.selectedCoverImageColorPalettes.ColourPalettes.length; i++) {
			var colorPalette = new ColorPalette(this.selectedCoverImageColorPalettes.ColourPalettes[i]);
			this.colorPalettes.push(colorPalette);
		}
	}

	/**
	 * Draw HaystackCards with the selectedCoverImageColorPalettes for the user
	 * to choose between, and create event handlers for those cards.
	 */
	this.drawCoverImageColorPalettes = function() {

		// Get an array of the color palettes,
		// from the selected cover image's color palettes data.
		this.setColorPalettesFromSelectedCoverImageColorPalettes();

		// For each color palette...
		for (var i = 0; i < this.colorPalettes.length; i++) {

			// Create a HaystackCard, using the original scannedCard as a template,
			// and overriding it's coverImage & colorScheme
			var thisCard = new HaystackCard({
				haystackCard: brandMaker.scannedCard,
				colorPalette: this.colorPalettes[i],
				coverImage: this.selectedCoverImage
			});

			 // Remove any avatars from the card (for cleaner viewing)
			thisCard.avatarImagePath = undefined;

			// Draw the HaystackCard
			$("#cardPreviews").append(thisCard.getHTML());
		}

		// Color palette event handlers
		var colorPalettesPage = this;
		$("#cardPreviews .haystack-card").on("click", function() {

			// Create a HaystackCard from their selection.

			// Get the colorPalette of the selected card, using it's ID attribute
			var biCoverImageColourPaletteId = $(this).attr("id");
			var colorPalette = colorPalettesPage.getColorPaletteFrombiCoverImageColourPaletteId(biCoverImageColourPaletteId);

			// Get the selectedCoverImage from earlier
			var coverImage = colorPalettesPage.selectedCoverImage;

			// Create a HaystackCard, using the original scannedCard as a template,
			// and overriding it's coverImage & colorScheme.
			var haystackCard = new HaystackCard({
				haystackCard: brandMaker.scannedCard,
				coverImage: coverImage,
				colorPalette: colorPalette,
			});
			// Set as branded, now that user has chosen a colorPalette
			haystackCard.isBranded = true;

			// Set this card as the result card.
			// Start sending the result to the server
			brandMaker.resultCard = haystackCard;
			brandMaker.brandingSuccess = true;
			brandMaker.sendBrandingResult();

			// Switch to the resultCard page. Does not display content -
			// is a callback from sendBrandingResult above.
			brandMaker.resultPage.drawPageElement();
			brandMaker.changePageTo(brandMaker.resultPage.pageElement);
		});
	}

	/**
	 * Draws a failstate for when getCoverImagesColorPalettes fails in plain view.
	 * Has options for a retry, and to choose another coverImage.
	 */
	this.drawFailState = function() {

		// Only show failure if page has been drawn,
		// but is not currently showing a color palette (ie still loading a color).
		if (colorPalettesPage.revealed === false &&
			colorPalettesPage.pageElement !== undefined) {

			// Create fail state element
			this.pageElement.empty();
			var string = 
			"<div class='failDialog'>" +
				"<p>Woops... couldn't reach the Haystack server.</p>" +
				"<button id='restart' class='fat retry'>Try again</button>" +
				"<button id='reselectLogo' class='fat back'>Reselect logo</button>" +
			"</div>";
			var failDialog = $($.parseHTML(string));
			this.pageElement.append(failDialog);

			// Retry button event handler
			var coverImagesPage = this;
			$("#restart", failDialog).on("click", function(e) {
				coverImagesPage.retry();
			});

			// Reselect Logo event handler
			var colorPallettePage = this;
			$("#reselectLogo", failDialog).on("click", function(e) {
				// Destroy this page, and change back to the coverImagesPage
				brandMaker.coverImagesPage.destruct();
				brandMaker.startBrandingProcess();
				brandMaker.coverImagesPage.changeTo();
				colorPallettePage.destruct();
			});

		// Otherwise, indicate that this request failed,
		// so that upon selecting another coverImage, the request will restart.
		} else {
			this.requestFailedSilently = true;
		}
	}

	/**
	 * [getCoverImagesColorPalettes description]
	 * @return {[type]}
	 */
	this.getCoverImagesColorPalettes = function() {

		colorPalettesPage = this;

		// If we have not yet exceeded maxRetries, go ahead and retry.
		if (colorPalettesPage.maxRetries === undefined ||
			colorPalettesPage.currentRetry < colorPalettesPage.maxRetries) {

			// Make the request
			$.ajax({
				type: 'GET',
				url: 'https://' + environment + 'api.thehaystackapp.com/1.0/images/coverImagesColourPalettesWeb/' + brandMaker.scannedCard.biBarcodeId + '.json',
				contentType: 'application/json',
				dataType: 'json',
				headers: {
					// UserAgent: "Haystack/1; Web/Homepage; " + window.navigator.userAgent
				}
			})
			.always(function(colorPaletteData) {
			})

			// If request fails, increment retry counter, then retry.
			.fail(function(colorPaletteData) {
				colorPalettesPage.currentRetry++;
				colorPalettesPage.getCoverImagesColorPalettes();
			})

			// If the request succeeds
			.done(function(colorPaletteData, textStatus, resp) {

				// Set the retry time & max retries.
				var retryTime = resp.getResponseHeader('Retry-After') * 1000;
				colorPalettesPage.maxRetries = resp.getResponseHeader('X-Haystack-Max-Retries');

				switch(colorPaletteData.Status) {


					// If the request was successful, but not all the data is yet returned...
					case 202:
					case 206:

						setTimeout(function() {

							// If any colorPaletteData (the Details object) has yet been returned...
							if (colorPaletteData.Details) {

								// Set the coverImagesColorPalettes array from the served data,
								// and display it if the data is ready.
								colorPalettesPage.setCoverImagesColorPalettes(colorPaletteData.Details[0].CoverImagesColourPalettes);
								colorPalettesPage.tryToReveal();
							}

							// Increment retry counter, then retry.
							colorPalettesPage.currentRetry++;
							colorPalettesPage.getCoverImagesColorPalettes(colorPalettesPage, brandMaker);

						}, retryTime);

					break;

					// If the request was successful, and all the data has arrived...
					case 200:

						// Set the coverImagesColorPalettes array from the served data,
						// and display it (if it hasn't been already)
						colorPalettesPage.setCoverImagesColorPalettes(colorPaletteData.Details[0].CoverImagesColourPalettes);
						colorPalettesPage.tryToReveal();

						// Reset current retries counter
						colorPalettesPage.currentRetry = 0;

					break;

					default:
					break;
				}
			});

		// If request exceeds max retries,
		// draw the fail state.
		} else {
			colorPalettesPage.drawFailState();
		}
	}
}


/**
 * Object representing the brandMaker page where
 * the user is shown the resulting card from the brandMaker process,
 * and either prompted to download the app or claim the card.
 * @param {BrandMaker} brandMaker - this pages's parent brandMaker.
 */
function ResultPage(brandMaker) {

	this.pageElement;        // Element that is, and contains, this page's UI.
	this.pageContentElement; // The interactive content of this page.

	/**
	 * Draws the container element for this page
	 */
	this.drawPageElement = function() {
		var string =
		"<div id='resultCardPage' class='brandMakerPage largeCardDialog'>" +
			"<div class='loadingIndicator'>" +
				"<img class='loadingImage' src='images/icons/loadingSpinner.gif'>" +
				"<p>Finishing up</p>" +
			"</div>" +
		"</div>";

		this.pageElement = $($.parseHTML(string));
		$("#brandMaker").append(this.pageElement);
	}

	/**
	 * Draws the internal UI & content of this page.
	 */
	this.drawPageContentElement = function() {

		// Get the type of result the brandMaker has produced.
		var resultType = brandMaker.getResultType();

		// From the result type, get the HTML string for this page's UI.
		switch (resultType) {

			// Unclaimed, branded card - with claim card button.
			case 0:
				var string =
				"<div id='resultPageContent' class='pageContent'>" +
					"<h2>Here is your new card.</h2>" +
					"<div id='resultCard'></div>" +
					"<button id='claimCard' class='fat cta'>Get it Now</button>" +
					"<p class='subtext'>(An email will be sent shortly to confirm it's yours)</p>" +
				"</div>";
			break;

			// Unclaimed, unbranded card - with download prompts + text
			case 1:
				var string =
				"<div id='resultPageContent'>" +
					"<h2>Your new card is almost ready.</h2>" +
					"<div id='resultCard'></div>" +
					"<p id='resultMessage'>Download the app to customize it, and add your company logo.</p>" +
					"<div class='downloadWrapper'>" +
						"<a href='https://itunes.apple.com/app/haystack-business-card-reader/id920294144'>" +
							"<img id='appleDownload' src='images/apple-download.png' alt='Download on the App Store'>" +
						"</a>" +
						"<a href='https://play.google.com/store/apps/details?id=com.theHaystackApp.haystack&referrer=utm_source%3DhaystackWebsite%26utm_medium%3DbrandMakerUnclaimedUnbranded'>" +
							"<img id='androidDownload' src='images/android-download.png' alt='Get it on Google Play'>" +
						"</a>" +
					"</div>" +
				"</div>";
			break;

			// Claimed card - with download prompts + text
			case 2:
				var string =
				"<div id='resultPageContent'>" +
					"<h2>Here is your card.</h2>" +
					"<div id='resultCard'></div>" +
					"<p id='resultMessage'>Download the app to customize it now.</p>" +
					"<div class='downloadWrapper'>" +
						"<a href='https://itunes.apple.com/app/haystack-business-card-reader/id920294144'>" +
							"<img id='appleDownload' src='images/apple-download.png' alt='Download on the App Store'>" +
						"</a>" +
						"<a href='https://play.google.com/store/apps/details?id=com.theHaystackApp.haystack&referrer=utm_source%3DhaystackWebsite%26utm_medium%3DbrandMakerClaimed'>" +
							"<img id='androidDownload' src='images/android-download.png' alt='Get it on Google Play'>" +
						"</a>" +
					"</div>" +
				"</div>";
			break;
		}

		// Create an HTML element from this string.
		this.pageContentElement = $($.parseHTML(string));

		// Add the content to the page, and display it.
		this.pageElement.empty();
		this.pageElement.append(this.pageContentElement);
		this.pageContentElement.fadeIn();

		// Add the result card to the content.
		$("#resultCard", this.pageContentElement).append(brandMaker.resultCard.getHTML());

		// Event handler for claim button
		// Activate claim card call, and cta replace button with loading button
		var resultPage = this;
		$("button", this.pageContentElement).on("click", function(e) {
			resultPage.claimCard();
			$(this).replaceWith($($.parseHTML("<button class='fat cta loading'></button>")));
		});
	}

	/**
	 * Creates a fail state for when the sendBrandingResult request fails.
	 */
	this.drawFailState = function() {

		// Create fail state element
		this.pageElement.empty();
		var string = 
		"<div class='failDialog'>" +
			"<p>Woops... couldn't reach the Haystack server.</p>" +
			"<button id='restart' class='fat retry'>Try again</button>" +
		"</div>";
		var failDialog = $($.parseHTML(string));
		this.pageElement.append(failDialog);

		// Retry button event handler
		var coverImagesPage = this;
		$("#restart", failDialog).on("click", function(e) {
			// Retry the request, and recreate the page.
			brandMaker.sendBrandingResult();
			brandMaker.resultPage.destruct();
			brandMaker.resultPage.drawPageElement();
			brandMaker.changePageTo(brandMaker.resultPage.pageElement);
		});
	}

	/**
	 * Destroy this page's impact on the DOM
	 * @return {[type]}
	 */
	this.destruct = function() {

		$(this.pageElement).remove();
	}

	/**
	 * Creates a fail state for when the claimCard request fails.
	 */
	this.claimFailState = function() {

		var resultPage = this;

		// Replace the "loading" button with a retry button.
		$("button", resultPage.pageContentElement).replaceWith($($.parseHTML("<button class='fat retry'>Try again</button>")));

		// When pressed, the retry button...
		$("button", this.pageContentElement).on("click", function(e) {

			// Retries the request
			resultPage.claimCard();

			// Displays the loading button.
			$(this).replaceWith($($.parseHTML("<button class='fat cta loading'></button>")));
		});
	}

	/**
	 * Initiates a claim process for the resultCard.
	 * Sends the user a claim / verification email,
	 * and upon success, displays the postClaimPage
	 */
	this.claimCard = function() {

		var resultPage = this;

		var url = 'https://' + environment + 'api.thehaystackapp.com/1.0/users/requestClaimItem.json';
		var vcItemHashId = brandMaker.resultCard.vcItemHashId;

		// Send the branding result
		$.ajax({
			type: 'POST',
			url: url,
			contentType: 'application/json',
			dataType: 'json',
			headers: {
				// UserAgent: "Haystack/1; Web/Homepage; " + window.navigator.userAgent
			},
			cache: false,
			processData: false,
			data: JSON.stringify({
				Action: "RequestClaimItem",
				BodyDetails: {
			       vcHash: vcItemHashId,
			       iBehaviouralParadigm: 0
				}
			})
		})
		.always(function(data) {

		// If the request fails, display a fail state.
		})
		.fail(function(data) {
			resultPage.claimFailState();
		})
		.done(function(data) {

			switch(data.Status) {

				// If the request succeeds, display the PostClaimPage
				case 200:
					brandMaker.postClaimPage.changeToThisPage();
				break;

				default:
					resultPage.claimFailState();
				break;
			}

		});
	}
}


/**
 * Object representing the brandMaker page where
 * the user is prompted to download the app after initiated a card claim,
 * and is displayed their resultCard in a phone frame for encouragement.
 * @param {BrandMaker} brandMaker - this pages's parent brandMaker.
 */
function PostClaimPage(brandMaker) {

	this.pageElement;        // Element that is, and contains, this page's UI.
	this.pageContentElement; // The interactive content of this page.

	// Create two demo cards with fake data
	this.card1 = new HaystackCard({});
	this.card2 = new HaystackCard({});

	// Set their fake data.
	this.card1.Fullname = "Anica Wilson";
	this.card1.Role = "HR Manager";
	this.card1.Company = "Virgin";
	this.card1.coverImage = new CoverImage("images/cards/coverVirgin.jpg");
	this.card1.avatarImagePath = "images/cards/avatarVirgin.jpg";

	this.card2.Fullname = "John Smith";
	this.card2.Role = "Partner";
	this.card2.Company = "PwC";
	this.card2.coverImage = new CoverImage("images/cards/coverPwc.jpg");
	this.card2.avatarImagePath = "images/cards/avatarPwc.jpg";

	// Set their custom color schemes
	var card1colors = Array();
	var card2colors = Array();

	card1colors.push("ffea2536");
	card1colors.push("66ffffff");
	card1colors.push("ffea2536");
	card1colors.push("ffffffff");
	card1colors.push("ccffffff");
	card1colors.push("b3000000");
	card1colors.push("ffffffff");
	card1colors.push("ffea2536");
	card1colors.push("33ffffff");
	card1colors.push("ffea2536");
	card1colors.push("99ffffff");
	card1colors.push("ffffffff");
	card1colors.push("ffea2536");
	card1colors.push("ccffffff");

	card2colors.push("ffde782a");
	card2colors.push("66ffffff");
	card2colors.push("ffde782a");
	card2colors.push("ffffffff");
	card2colors.push("ccffffff");
	card2colors.push("b3000000");
	card2colors.push("ffffffff");
	card2colors.push("ffde782a");
	card2colors.push("33ffffff");
	card2colors.push("ffde782a");
	card2colors.push("99ffffff");
	card2colors.push("ffffffff");
	card2colors.push("ffde782a");
	card2colors.push("ccffffff");

	this.card1.colorPalette = new ColorPalette(card1colors);
	this.card2.colorPalette = new ColorPalette(card2colors);

	/**
	 * Draws the container element for this page
	 */
	this.drawPageElement = function() {
		var string =
		"<div id='postClaimPage' class='brandMakerPage'>" +
		"</div>";

		this.pageElement = $($.parseHTML(string));
		$("#brandMaker").append(this.pageElement);
	}

	/**
	 * Draws the internal UI & content of this page.
	 */
	this.drawPageContentElement = function() {
		var string =
		"<div id='postClaimPageContent' class='pageContent'>" +
			"<h2>Congratulations!</h2>" +
			"<p>Your new Haystack card is ready. Download the app to customize it now.</p>" +
			"<div class='downloadWrapper'>" +
				"<a href='https://itunes.apple.com/app/haystack-business-card-reader/id920294144'>" +
					"<img id='appleDownload' src='images/apple-download.png' alt='Download on the App Store'>" +
				"</a>" +
				"<a href='https://play.google.com/store/apps/details?id=com.theHaystackApp.haystack&referrer=utm_source%3DhaystackWebsite%26utm_medium%3DbrandMakerUnclaimedBranded'>" +
					"<img id='androidDownload' src='images/android-download.png' alt='Get it on Google Play'>" +
				"</a>" +
			"</div>" +
			"<div id='demoPhone'>" +
				"<div id='screen'></div>" +
			"</div>" +
		"</div>";

		this.pageContentElement = $($.parseHTML(string));
		this.pageElement.append(this.pageContentElement);

		// Add result card to phone screen
		$("#screen", this.pageContentElement).append(brandMaker.resultCard.getHTML());

		// Add demo cards to phone screen
		$("#screen", this.pageContentElement).append(this.card1.getHTML());
		$("#screen", this.pageContentElement).append(this.card2.getHTML());

		// Set font-size of these haystack-cards to ensure
		// cardBar is at correct scale, and recalculate on window resize.
		setTimeout(function() {
			var fontSize = parseInt($("#screen").width()) / 17 +"px";
			$("#screen .haystack-card").css('font-size', fontSize);
		}, 300);
		$(window).resize(function(){
			var fontSize = parseInt($("#screen").width()) / 17 +"px";
			$("#screen .haystack-card").css('font-size', fontSize);
		});

	}

	/**
	 * Draw this page, and then turn the brandMaker to it
	 */
	this.changeToThisPage = function() {
		this.drawPageElement();
		this.drawPageContentElement();
		brandMaker.changePageTo(this.pageElement);

		// Reskin the brandMaker while this page is active
		$("#brandMaker").addClass("postClaim");
	}

	/**
	 * Destroy this page's effect on the DOM
	 */
	this.destruct = function() {

		// Remove this page's element
		this.pageElement.remove();

		// Remove custom reskin of the brandMaker
		$("#brandMaker").removeClass("postClaim");
	}
}


/**
 * Object representing a Haystck Card in it's entirety.
 * Includes data, logic, and UI element generation code.
 * @param {object} - an object containing the following optional values:
 * haystackCard - Another HaystackCard object to serve as a template for this one.
 * details - Raw card details recieved from the server
 * colorPalette - A colorPalette object (overrides)
 * coverImage - A coverImage object (overrides)
 */
function HaystackCard(props) {

	// Default values
	this.Fullname = "Your Name";
	this.Role = "Role";
	this.Company = "Organisation";
	this.colorPalette = new ColorPalette();
	this.coverImage = undefined;
	this.avatarImagePath = undefined;
	this.isBranded = false;

	// If another card has been provided as a template, inherit it's details.
	if (props.haystackCard !== undefined) {
		this.Fullname = props.haystackCard.Fullname;
		this.Role = props.haystackCard.Role;
		this.Company = props.haystackCard.Company;
		this.coverImage = props.haystackCard.coverImage;
		this.avatarImagePath = props.haystackCard.avatarImagePath;
		this.colorPalette = props.haystackCard.colorPalette;
		this.ItemDetails = props.haystackCard.ItemDetails;
		this.EligibleForBrandingEnum = props.haystackCard.EligibleForBrandingEnum;
		this.bClaimed = props.haystackCard.bClaimed;
		this.biBarcodeId = props.haystackCard.biBarcodeId;
		this.vcItemHashId = props.haystackCard.vcItemHashId;
		this.isBranded = props.haystackCard.isBranded;
	}

	// If there are details from the server, override defaults with these.
	if (props.details !== undefined) {
		this.ItemDetails = props.details.ItemDetails;
		this.EligibleForBrandingEnum = props.details.EligibleForBrandingEnum;
		this.vcItemHashId = props.details.vcItemHashId;
		this.biBarcodeId = props.details.biBarcodeId;
		this.bClaimed = props.details.bClaimed;
		if (this.EligibleForBrandingEnum === 3) {
			this.isBranded = true;
		}

		// Where there are values, replace the defaults.
		if (this.ItemDetails[columnMap["Fullname"]] !== undefined) {
			this.Fullname = this.ItemDetails[columnMap["Fullname"]][0].tValue;
		}
		if (this.ItemDetails[columnMap["Role"]] !== undefined) {
			this.Role = this.ItemDetails[columnMap["Role"]][0].tValue;
		}
		if (this.ItemDetails[columnMap["Company"]] !== undefined) {
			this.Company = this.ItemDetails[columnMap["Company"]][0].tValue;
		}
		if (this.ItemDetails[columnMap["CoverURL"]] !== undefined) {
			this.coverImage = new CoverImage(this.ItemDetails[columnMap["CoverURL"]][0].tValue);
		}
		if (this.ItemDetails[columnMap["AvatarURL"]] !== undefined) {
			this.avatarImagePath = this.ItemDetails[columnMap["AvatarURL"]][0].tValue;
		}


		// For each value that exists in both the colorPalette and the ItemDetails...
		for (key in columnMap) {
			if (this.ItemDetails[columnMap[key]]) {
				
				// Override the colorPalette with ItemDetails.
				this.colorPalette[key] = this.ItemDetails[columnMap[key]][0].tValue;
			}
		}
	}

	// Override default or server coverImage with one provided
	if (props.coverImage !== undefined) {
		this.coverImage = props.coverImage;
	}

	// If there is an overridding color palette,
	// make that the color palette for this card.
	if (props.colorPalette !== undefined) {
		this.colorPalette = props.colorPalette;
	}

	/**
	 * Get the HTML string to be this card's avatar.
	 * Can be svg or an image, depending on if an avatar has been defined for this card.
	 * @return {string} - HTML string for the card avatar.
	 */
	this.getAvatarString = function() {

		// If no avatar path is set...
		if (this.avatarImagePath === undefined) {

			// Return an SVG placeholder.
			return "<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' version='1.1' x='0px' y='0px' viewBox='34 34 252 252' enable-background='new 34 34 252 252' xml:space='preserve' style='fill: " + argbHexToRgba(this.colorPalette.ColorDivider, 0.5) + "'>" +
				"<g>" +
					"<circle cx='162.6' cy='138.7' r='53.7'/>" +
					"<path d='M252.8 255.7c0 0 0-1.7 0-1.7c0-27.6-18.3-47.8-45.9-47.8h-88.6c-27.6 0-51.1 20.1-51.1 47.8c0 0 0 1.7 0 1.7l0 0V286 h185.6V255.7L252.8 255.7z'/>" +
				"</g>" +
			"</svg>";

		// Otherwise, return an image element.
		} else {
			return "<img src='" + this.avatarImagePath + "'></img>";
		}
	}

	/**
	 * Get the HTML string to be this card's cover image.
	 * Can be svg or an image, depending on if an coverImage object has been defined for this card.
	 * @return {string} - HTML string for the card cover image.
	 */
	this.getCoverImageString = function() {

		// If no coverImage is defined...
		if (this.coverImage === undefined) {

			// Return an SVG Placeholder
			return '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" x="0px" y="0px" viewBox="0 0 1080 720" enable-background="new 0 0 1080 720" xml:space="preserve" style="fill: ' + argbHexToRgba(this.colorPalette.ColorDivider, 1) + '">' +
					'<g>' +
						'<path d="M599.8 291.5c-0.4-0.6-1-1.4-1.6-1.7s-1.5-0.8-2.4-0.8H590v14h5.6c1.8 0 3.2-0.5 4.1-1.7c0.9-1.2 1.4-2.8 1.4-4.9 c0-1-0.1-2-0.3-2.8C600.6 292.8 600.3 292.1 599.8 291.5z"/>' +
						'<path d="M514 301.2v7.6c0 2.1 0.2 3.8 0.5 5.3c0.3 1.5 0.8 2.7 1.4 3.6c0.6 0.9 1.4 1.6 2.3 2.1c0.9 0.4 2 0.7 3.2 0.7 c1.2 0 2.2-0.2 3.1-0.7c0.9-0.4 1.6-1.1 2.2-2.1c0.6-0.9 1.3-2.1 1.6-3.6c0.3-1.5 0.7-3.2 0.7-5.3v-7.6c0-2.2-0.4-4-0.7-5.6 c-0.3-1.5-0.9-2.8-1.5-3.8c-0.6-1-1.4-1.7-2.3-2.2c-0.9-0.5-2-0.7-3.1-0.7c-1.2 0-2.2 0.2-3.1 0.7c-0.9 0.5-1.7 1.2-2.3 2.2 c-0.6 1-1.1 2.2-1.5 3.8C514.2 297.2 514 299 514 301.2z"/>' +
						'<path d="M511.1 361.3c-1.1-1.7-2.4-3-4-3.8c-1.6-0.8-3.4-1.2-5.4-1.2c-2.1 0-3.9 0.4-5.5 1.2c-1.6 0.8-2.9 2.1-4 3.8 c-1.1 1.7-1.9 3.9-2.4 6.6c-0.5 2.7-0.9 5.9-0.9 9.7v13.4c0 3.6 0.3 6.7 0.9 9.3c0.5 2.6 1.4 4.7 2.5 6.3c1.1 1.6 2.4 2.9 4 3.6 c1.6 0.8 3.4 1.2 5.5 1.2c2 0 3.9-0.4 5.4-1.2c1.6-0.8 2.9-2 3.9-3.6c1.1-1.6 1.7-3.8 2.2-6.3c0.5-2.6 0.6-5.7 0.6-9.3v-13.4 c0-3.8-0.1-7.1-0.6-9.7C512.8 365.2 512.2 363 511.1 361.3z"/>' +
						'<path d="M540 185c-96.7 0-175 78.4-175 175c0 96.7 78.4 175 175 175c96.6 0 175-78.4 175-175C715 263.4 636.6 185 540 185z M567.4 218.4l2.5-5.1l2.5 5.1l5.7 0.8l-4.1 4l1 5.6l-5-2.6l-5.1 2.6l1-5.6l-4.1-4L567.4 218.4z M553.5 316.9 c0.3 0.9 0.7 1.7 1.2 2.2c0.5 0.5 1.1 0.9 1.9 1.1c0.7 0.2 1.6 0.3 2.5 0.3c0.9 0 1.8-0.1 2.5-0.3c0.7-0.2 1.3-0.6 1.8-1.1 c0.5-0.5 0.9-1.3 1.2-2.2c0.3-0.9 0.4-2.2 0.4-3.7V281h9v32.2c0 2.7-0.3 4.9-1.1 6.8c-0.7 1.9-1.7 3.4-3.1 4.6 c-1.3 1.2-2.9 2.1-4.7 2.6c-1.8 0.6-3.8 0.8-6 0.8c-2.2 0-4.2-0.3-6.1-0.8c-1.8-0.6-3.4-1.4-4.8-2.6s-2.4-2.7-3.1-4.6 c-0.7-1.9-1.1-4.1-1.1-6.8V281h9v32.2C553 314.8 553.3 316 553.5 316.9z M536.4 212.1l3.6-7.3l3.6 7.3l8 1.2l-5.8 5.7l1.4 8 l-7.2-3.8l-7.2 3.8l1.4-8l-5.8-5.7L536.4 212.1z M528.1 282.6c2 0.8 3.7 2.1 5.2 3.8c1.5 1.7 2.7 3.8 3.5 6.3 c0.8 2.5 1.3 5.4 1.3 8.7v7.6c0 3.2-0.5 6-1.3 8.4c-0.8 2.4-1.9 4.4-3.4 6c-1.4 1.6-3.2 2.8-5.2 3.6c-2 0.8-4.3 1.2-6.7 1.2 c-2.4 0-4.7-0.4-6.7-1.2c-2-0.8-3.8-2-5.2-3.6c-1.5-1.6-2.6-3.6-3.4-6c-0.8-2.4-1.2-5.2-1.2-8.4v-7.6c0-3.3 0.4-6.2 1.2-8.7 c0.8-2.5 1.9-4.6 3.3-6.3c1.4-1.7 3.2-2.9 5.2-3.8c2-0.8 4.3-1.3 6.7-1.3C523.8 281.3 526.1 281.7 528.1 282.6z M506.1 218.4 l2.5-5.1l2.5 5.1l5.6 0.8l-4.1 4l1 5.6l-5.1-2.6l-5 2.6l1-5.6l-4.1-4L506.1 218.4z M468 423h-44v-80h16v67h28V423z M478.7 281 l6.9 20.5l6.9-20.5h10L490 311v16h-9v-16l-12.3-30H478.7z M515.9 515.6l-5.1-2.6l-5 2.6l1-5.6l-4.1-4l5.6-0.8l2.5-5.1l2.5 5.1 l5.6 0.8l-4.1 4L515.9 515.6z M513.6 422.8c-3.5 1.4-7.4 2.1-11.7 2.1c-4.3 0-8.2-0.7-11.7-2.1s-6.6-3.5-9.1-6.4 c-2.5-2.8-4.5-6.3-5.9-10.6c-1.4-4.2-2.1-9.2-2.1-14.8v-13.3c0-5.7 0.7-10.8 2-15.2c1.4-4.4 3.3-8 5.9-11c2.5-2.9 5.6-5.1 9.1-6.6 c3.6-1.5 7.5-2.2 11.7-2.2c4.3 0 8.2 0.7 11.7 2.2c3.5 1.5 6.6 3.7 9.1 6.6c2.5 2.9 4.7 6.6 6.1 11c1.4 4.4 2.3 9.4 2.3 15.2v13.3 c0 5.6-0.9 10.5-2.3 14.8c-1.4 4.2-3.4 7.8-6 10.6C520.2 419.3 517.1 421.4 513.6 422.8z M547.2 524.3l-7.2-3.8l-7.2 3.8l1.4-8 l-5.8-5.7l8-1.2l3.6-7.3l3.6 7.3l8 1.2l-5.8 5.7L547.2 524.3z M573 515.6l-5.1-2.6l-5 2.6l1-5.6l-4.1-4l5.7-0.8l2.5-5.1l2.5 5.1 l5.6 0.8l-4.1 4L573 515.6z M557.9 400.4c0.6 2.6 1.5 4.8 2.6 6.4c1.2 1.7 2.6 2.9 4.4 3.6c1.8 0.7 3.8 1.1 6.2 1.1 c1.4 0 2.6-0.1 3.7-0.3c1-0.2 1.9-0.5 2.6-0.8c0.7-0.3 1.2-0.6 1.6-1c0.5-0.3 1-0.6 1-0.8V394h-11v-13h27v33.8c0 0.9-1.7 2-3.2 3.1 c-1.4 1.2-3.1 2.3-5.2 3.3c-2.1 1-4.6 1.9-7.5 2.6c-2.9 0.7-6.2 1.1-10 1.1c-4.5 0-8.5-0.7-12.1-2.1c-3.6-1.4-6.7-3.5-9.2-6.3 c-2.6-2.8-4.5-6.4-5.9-10.7c-1.4-4.3-2-9.4-2-15.2v-13.5c0-5.8 0.6-10.9 1.9-15.2c1.3-4.3 3.2-7.9 5.6-10.7c2.4-2.9 5.4-5 8.9-6.4 c3.5-1.4 7.4-2.1 11.8-2.1c4.5 0 8.5 0.6 11.7 1.7c3.3 1.1 6 2.8 8.2 5.1c2.2 2.2 3.9 4.8 5 8.1c1.2 3.3 1.9 7.3 2.3 11.3h-15.7 c-0.2-3-0.6-4.4-1.1-6.1c-0.5-1.7-1.2-2.9-2.1-3.9c-0.9-1-2-1.7-3.3-2.1c-1.3-0.4-2.8-0.6-4.6-0.6c-2.1 0-4 0.4-5.5 1.1 c-1.6 0.8-2.9 2-3.9 3.6c-1 1.7-1.9 3.8-2.4 6.5c-0.5 2.7-0.8 5.9-0.8 9.6v13.6C557 394.5 557.3 397.7 557.9 400.4z M594.9 310H590 v17h-9v-46h14.8c2.3 0 4.3 0.8 6.1 1.4c1.8 0.6 3.3 1.7 4.5 2.9c1.2 1.2 2.2 2.7 2.8 4.4c0.7 1.7 1 3.8 1 6c0 1.6-0.2 3.2-0.5 4.5 c-0.3 1.3-0.7 2.5-1.3 3.6c-0.6 1-1.3 1.9-2.1 2.7c-0.8 0.8-1.6 1.4-2.6 2l8.2 18.7V327h-10.2L594.9 310z M662 405.8 c-1.4 4.2-3.3 7.8-5.8 10.6c-2.5 2.8-5.5 4.9-9 6.4c-3.5 1.4-7.4 2.1-11.7 2.1c-4.3 0-8.2-0.7-11.7-2.1s-6.6-3.5-9.1-6.4 c-2.5-2.8-4.3-6.3-5.7-10.6c-1.4-4.2-1.9-9.2-1.9-14.8v-13.3c0-5.7 0.5-10.8 1.9-15.2c1.4-4.4 3.2-8 5.8-11 c2.5-2.9 5.5-5.1 9.1-6.6c3.5-1.5 7.4-2.2 11.7-2.2c4.3 0 8.2 0.7 11.7 2.2c3.5 1.5 6.6 3.7 9.1 6.6c2.5 2.9 4.4 6.6 5.8 11 c1.4 4.4 2 9.4 2 15.2v13.3C664 396.7 663.4 401.6 662 405.8z"/>' +
						'<path d="M644.7 361.3c-1.1-1.7-2.4-3-4-3.8c-1.6-0.8-3.4-1.2-5.4-1.2c-2.1 0-3.9 0.4-5.5 1.2c-1.6 0.8-2.9 2.1-4 3.8 c-1.1 1.7-1.7 3.9-2.2 6.6c-0.5 2.7-0.7 5.9-0.7 9.7v13.4c0 3.6 0.1 6.7 0.7 9.3c0.5 2.6 1.3 4.7 2.4 6.3c1.1 1.6 2.4 2.9 4 3.6 c1.6 0.8 3.4 1.2 5.5 1.2c2 0 3.8-0.4 5.4-1.2c1.6-0.8 2.9-2 3.9-3.6c1.1-1.6 1.9-3.8 2.4-6.3c0.5-2.6 0.8-5.7 0.8-9.3v-13.4 c0-3.8-0.3-7.1-0.8-9.7C646.6 365.2 645.8 363 644.7 361.3z"/>' +
					'</g>' +
				'</svg>';

		// Otherwise, return an image element.
		} else {
			return "<img src='" + this.coverImage.CoverImagePath + "'></img>";
		}
	}

	/**
	 * Return a jQuery element of this card's UI.
	 * @return {[type]}
	 */
	this.getHTML = function() {

		var string =
		"<div id='" + this.colorPalette.biCoverImageColourPaletteId + "' class='haystack-card' style='background-color: " + argbHexToRgba(this.colorPalette.ColorBannerBackground, 1) +"'>" +
			"<div class='cardImages'>" +
				"<div class='avatar' style='background-color: " + argbHexToRgba(this.colorPalette.ColorAvatarBackground, 1) +"'>" +					
					this.getAvatarString() +
				"</div>" +
				"<div class='cover' style='background-color: " + argbHexToRgba(this.colorPalette.ColorBannerBackground, 1) +"'>" +					
					this.getCoverImageString() +
				"</div>" +
			"</div>" +
			"<div class='cardbar' style='border-top-color: " + argbHexToRgba(this.colorPalette.ColorDivider, 1) +"; background-color: " + argbHexToRgba(this.colorPalette.ColorActionIconsBackground, 1) +"'>" +
				"<span class='full-name' style='color: " + argbHexToRgba(this.colorPalette.ColorTextGroup1, 1) +"'>" + this.Fullname + "</span>" +
				"<span class='role-company' style='color: " + argbHexToRgba(this.colorPalette.ColorTextGroup2, 1) +"'>" + this.Role + " at " + this.Company + "</span>" +
			"</div>" +
		"</div>";

		return $($.parseHTML(string));
	}
}


/**
 * Object representing a coverImage
 * @param {[type]}
 */
function CoverImage(coverImageData) {

	// If data has been provided...
	if (coverImageData !== undefined) {

		// If it is a string url...
		if (typeof coverImageData === 'string') {
			// Use the URL as the image path.
			this.CoverImagePath = coverImageData;

		// Otherwise, we assume it is coverImageData from the server,
		// and store it in this object.
		} else {				
			this.biCoverImageId = coverImageData.biCoverImageId;
			this.CoverImagePath = coverImageData.CoverImagePath;
			this.CoverImageHeight = coverImageData.CoverImageHeight;
			this.CoverImageWidth = coverImageData.CoverImageWidth;
		}
	}

	/**
	 * Creates element to display this coverImage
	 * @return {object} - jQuery element of the coverImage.
	 */
	this.getHTML = function() {
		var string = 
		"<div class='logoPreview' id='" + this.biCoverImageId + "'>" +
			"<img src='" + this.CoverImagePath + "'>" +
		"</div>";
		return $($.parseHTML(string));
	}
}


/**
 * Object that represents a color palette for a card
 * @param {Object OR Array} colorPaletteData - 
 * can be colorPaletteData from the server,
 * or an array of colors (in the correct order).
 */
function ColorPalette(colorPaletteData) {

	/**
	 * Gets a color value from the label of a color
	 * @param  {string} color label 
	 * @return {string} ARGB Hex color
	 */
	this.getColor = function(colorLabel) {

		// Get the color labeled "colorLabel"
		var colorObject = colorPaletteData.Colours.filter(
			function(data){
				return data.biCategoryColumnsId == columnMap[colorLabel];
			}
		)[0];

		// Return it's actual value.
		return colorObject.tValue;
	}

	// If color data has been provided...
	if (colorPaletteData !== undefined) {

		// If the provided colors are in the format of an array...
		if (colorPaletteData.constructor === Array) {

			// Set them (in order) as this colorPalette's colors.
			this.ColorAvatarBackground                = colorPaletteData[0];
			this.ColorActionBarIcons                  = colorPaletteData[1];
			this.ColorBannerBackground                = colorPaletteData[2];
			this.ColorTextGroup1                      = colorPaletteData[3];
			this.ColorTextGroup2                      = colorPaletteData[4];
			this.ColorBannerOpaqueForegroundLandscape = colorPaletteData[5];
			this.ColorActionIconsAndTextLandscape     = colorPaletteData[6];
			this.ColorDetailsBackground               = colorPaletteData[7];
			this.ColorDivider                         = colorPaletteData[8];
			this.ColorActionIconsBackground           = colorPaletteData[9];
			this.ColorActionIcons                     = colorPaletteData[10];
			this.ColorTextGroup3                      = colorPaletteData[11];
			this.ColorAddToContactsBackground         = colorPaletteData[12];
			this.ColorAddToContactsIconAndText        = colorPaletteData[13];

		// Otherwise, we assume it is colorPaletteData from the server,
		// and set the colors from that.
		} else {

			// Save the ID of this palette for later.
			this.biCoverImageColourPaletteId = colorPaletteData.biCoverImageColourPaletteId;

			this.ColorAvatarBackground                = this.getColor("ColorAvatarBackground");
			this.ColorActionBarIcons                  = this.getColor("ColorActionBarIcons");
			this.ColorBannerBackground                = this.getColor("ColorBannerBackground");
			this.ColorTextGroup1                      = this.getColor("ColorTextGroup1");
			this.ColorTextGroup2                      = this.getColor("ColorTextGroup2");
			this.ColorBannerOpaqueForegroundLandscape = this.getColor("ColorBannerOpaqueForegroundLandscape");
			this.ColorActionIconsAndTextLandscape     = this.getColor("ColorActionIconsAndTextLandscape");
			this.ColorDetailsBackground               = this.getColor("ColorDetailsBackground");
			this.ColorDivider                         = this.getColor("ColorDivider");
			this.ColorActionIconsBackground           = this.getColor("ColorActionIconsBackground");
			this.ColorActionIcons                     = this.getColor("ColorActionIcons");
			this.ColorTextGroup3                      = this.getColor("ColorTextGroup3");
			this.ColorAddToContactsBackground         = this.getColor("ColorAddToContactsBackground");
			this.ColorAddToContactsIconAndText        = this.getColor("ColorAddToContactsIconAndText");
		}

	// If no color data provided, use a default white color scheme.
	} else {

		this.biCoverImageColourPaletteId = 0;

		this.ColorAvatarBackground                = "ffffffff";
		this.ColorActionBarIcons                  = "33000000";
		this.ColorBannerBackground                = "ffffffff";
		this.ColorTextGroup1                      = "cc000000";
		this.ColorTextGroup2                      = "99000000";
		this.ColorBannerOpaqueForegroundLandscape = "66ffffff";
		this.ColorActionIconsAndTextLandscape     = "ff000000";
		this.ColorDetailsBackground               = "ffffffff";
		this.ColorDivider                         = "1a000000";
		this.ColorActionIconsBackground           = "ffffffff";
		this.ColorActionIcons                     = "99000000";
		this.ColorTextGroup3                      = "ff000000";
		this.ColorAddToContactsBackground         = "ffffffff";
		this.ColorAddToContactsIconAndText        = "cc000000";
	}
}


/**
 * Key - Value pairs connecting labels with categoryColumnId's.
 * Currently hardcoded, should be created with an API call (or something).
 * @type {Object}
 */
columnMap = {
	"Company"                              : 14,
	"Fullname"                             : 15,
	"Role"                                 : 16,
	"Email"                                : 21,
	"CoverURL"                             : 76,
	"AvatarURL"                            : 308,
	"ColorAvatarBackground"                : 316,
	"ColorActionBarIcons"                  : 317,
	"ColorBannerBackground"                : 318,
	"ColorTextGroup1"                      : 319,
	"ColorTextGroup2"                      : 320,
	"ColorBannerOpaqueForegroundLandscape" : 321,
	"ColorActionIconsAndTextLandscape"     : 322,
	"ColorDetailsBackground"               : 323,
	"ColorDivider"                         : 324,
	"ColorActionIconsBackground"           : 325,
	"ColorActionIcons"                     : 326,
	"ColorTextGroup3"                      : 327,
	"ColorAddToContactsBackground"         : 328,
	"ColorAddToContactsIconAndText"        : 329
}


/**
 * Converts a color in HEX format "AARRGGBB" to
 * a color in rgba format "rgba(255,255,255,1)"
 * @param  {string} argbHex - hex value to convert to rgba
 * @param  {float} opacityMultiplier - multiplier to apply to the alpha channel during conversion.
 * @return {string} - a color in rgba format "rgba(255,255,255,1)"
 */
function argbHexToRgba(argbHex, opacityMultiplier) {

	// Some magic code that converts 4 hex values to an array of integers
	var argb = argbHex.match(/(.{2})/g);
	var i = 4;
	for (var i = 0; i < argb.length; i++) {
		argb[i] = parseInt(argb[i], 16);
	}

	return 'rgba(' + 
		argb[1] + ', ' + 
		argb[2] + ', ' + 
		argb[3] + ', ' + 
		// Convert alpha to decimal.
		( (1/256) * (argb[0]+1) * opacityMultiplier) + ')';
}


/**
 * Checks is an email address is valid
 * @param  {string} - email address input by the user
 * @return {bool} - true if valid, false if invalid
 */
function emailValid(email) { 
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}


/**
 * Displays a message informing the user that their
 * input email address is not a valid email address.
 * @param  {string} email - invalid email the user has entered.
 */
function showInvalidEmailMessage(email) {

	// Hide any existing message
	hideInvalidEmailMessage();

	// Create message
	var string = "<p id='invalidEmail'>'" + email + "' is not a valid email address.</p>";

	// Display message
	$("#emailForm").after($($.parseHTML(string)));
}


/**
 * Hides the message informing the user of the user that
 * their email address is invalid.
 */
function hideInvalidEmailMessage() {

	$("#invalidEmail").remove();
}
 

/**
 * Creates disposable images objects from an array of image paths,
 * to force loading before display.
 */
function preloadImages() {
	var preload = [
		"images/icons/close.png",
		"images/icons/loadingSpinnerBlue.gif",
		"images/icons/bad-logo-blue.png",
		"images/icons/bad-logo-white.png",
		"images/icons/redo-blue.png",
		"images/icons/redo-white.png",
		"images/icons/back-blue.png",
		"images/icons/back-white.png",
		"images/icons/done-white.png",
		"images/icons/edit-card-yellow.png",
		"images/icons/loadingSpinner.gif",
		"images/phone.png",
		"images/icons/close-dark.png",
		"images/icons/close-white.png"
	];
	var images = [];
	for (i = 0; i < preload.length; i++) {
	    images[i] = new Image();
	    images[i].src = preload[i];
	}
}