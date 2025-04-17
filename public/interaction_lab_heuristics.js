/**
 * InteractionLab Heuristics Module
 * 
 * This module provides functionality for tracking user interactions and experiment data
 * for UX research purposes. It handles event tracking, data collection, and communication
 * with a tracking server.
 * 
 * @module interaction_lab_heuristics
 */

// Import jQuery properly for webpack
import $ from 'jquery';

/* Constants for identifying different types of events */
const VERSION = 3;

// Event type constants for tracking different user interactions
const EVENT_ON_MOUSE_MOVE = 0;
const EVENT_ON_CLICK = 1;
const EVENT_ON_DOUBLE_CLICK = 2;
const EVENT_ON_MOUSE_DOWN = 3;
const EVENT_ON_MOUSE_UP = 4;
const EVENT_ON_WHEEL = 5;
const EVENT_CONTEXT_MENU = 6;
const EVENT_WINDOW_SCROLL = 11;
const EVENT_WINDOW_RESIZE = 12;
const EVENT_KEY_DOWN = 13;
const EVENT_KEY_PRESS = 14;
const EVENT_KEY_UP = 15;
const EVENT_FOCUS = 16;
const EVENT_BLUR = 17;
const EVENT_ON_CHANGE_SELECTION_OBJECT = 18;
const EVENT_ON_CLICK_SELECTION_OBJECT = 19;
const EVENT_INIT_TRACKING = 100;
const EVENT_TRACKIND_END = 200;

// Component type constants for identifying different UI elements
const COMPONENT_TEXT_FIELD = 1;
const COMPONENT_COMBOBOX = 2;
const COMPONENT_OPTION = 3;
const COMPONENT_RADIO_BUTTON = 4;
const COMPONENT_CHECK_BOX = 5;

/**
 * Class representing a UI element that can be tracked
 */
class Element {
	/**
	 * Create a trackable element
	 * @param {string} id - Element identifier
	 * @param {number} x - X coordinate of top-left corner
	 * @param {number} y - Y coordinate of top-left corner
	 * @param {number} xF - X coordinate of bottom-right corner
	 * @param {number} yF - Y coordinate of bottom-right corner
	 * @param {number} sceneId - ID of the scene this element belongs to
	 */
	constructor(id, x, y, xF, yF, sceneId) {
		this.id = id;
		this.x = x;
		this.y = y;
		this.xF = xF;
		this.yF = yF;
		this.sceneId = sceneId;
	}

	/**
	 * Get the scene ID this element belongs to
	 * @returns {number} The scene ID
	 */
	getScene() {
		return this.sceneId;
	}

	/**
	 * Check if a point is over this element
	 * @param {number} mX - X coordinate to check
	 * @param {number} mY - Y coordinate to check
	 * @returns {boolean} True if point is over the element
	 */
	isOver(mX, mY) {
		return (this.x < mX && mX < this.xF && this.y < mY && mY < this.yF);
	}
}

/**
 * The main InteractionLab tracking module
 */
const InteractionLabHeuristics = (function () {
	// Private module variables
	let user = null;
	let list = [];
	let sceneId = 0;
	let eventCounter = 0;
	let trackingOn = false;
	const TOP_LIMIT = 500;
	let sentRequest = 0;
	let pendingRequest = 0;

	let pendingBackgroundsDelivered = 0;
	let backgroundsDelivered = 0;
	let eventsDelivered = false;
	let finishedExperiment = false;

	let newPage = null;
	let elements = [];
	let emittingData = false;

	const idExperiment = 14;
	const urlBase = window.location.protocol === 'https:'
		? 'https://156.35.163.173:8443'  // Use HTTPS port if available
		: 'http://156.35.163.173:8080';  // Fallback to HTTP

	const url = urlBase + '/TrackerServer/restws/track';
	const urlBackgroundTracker = urlBase + '/TrackerServer/restws/backgroundTracker';
	const urlRegisterComponent = urlBase + '/TrackerServer/restws/registerComponent';
	const urlRegisterUserData = urlBase + '/TrackerServer/restws/registerUserData';
	const urlDemographicData = urlBase + '/TrackerServer/restws/registerDemographicData';
	const urlExperimentStatus = urlBase + '/TrackerServer/restws/experiment/status/' + idExperiment;

	/**
	 * Create a unique user identifier
	 * @returns {string} The user identifier
	 * @private
	 */
	function createUser() {
		if (localStorage.getItem("user") === null || localStorage.getItem("user") === undefined) {
			let lettrs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
			localStorage.setItem("user",
				lettrs[Math.floor(Math.random() * lettrs.length)] +
				lettrs[Math.floor(Math.random() * lettrs.length)] +
				lettrs[Math.floor(Math.random() * lettrs.length)] +
				(Math.floor(Math.random() * (999999999999 - 100000000000)) + 100000000000).toString() +
				Date.now().toString() + getDate()
			);
		}
		return localStorage.getItem("user");
	}

	/**
	 * Get current date as a string in format MMDDYYYY
	 * @returns {string} The formatted date
	 * @private
	 */
	function getDate() {
		const today = new Date();
		const day = today.getDate();
		const month = today.getMonth() + 1;
		const year = today.getFullYear();
		return (`${month}${day}${year}`);
	}

	/**
	 * Find an element based on mouse coordinates
	 * @param {number} x - X coordinate
	 * @param {number} y - Y coordinate
	 * @returns {string|number} Element ID or -1 if not found
	 * @private
	 */
	function detectElement(x, y) {
		let found = -1;
		elements.forEach(function (entry) {
			if (entry.isOver(x, y) && entry.getScene() === sceneId) {
				found = entry.id;
			}
		});
		return found;
	}

	/**
	 * Find an element by its ID
	 * @param {string} name - Element ID to find
	 * @returns {string|number} Element ID or -1 if not found
	 * @private
	 */
	function detectElementByName(name) {
		let found = -1;
		elements.forEach(function (entry) {
			if (entry.id === name && entry.getScene() === sceneId) {
				found = entry.id;
			}
		});
		return found;
	}

	/**
	 * Add focus and blur event listeners to an element
	 * @param {string} elementId - ID of the element
	 * @private
	 */
	function addFocusAndBlurEvents(elementId) {
		const element = document.getElementById(elementId);
		if (element !== undefined && element !== null) {
			element.addEventListener('focus', function (event) {
				trackFocusEvent(event);
			});
			element.addEventListener('blur', function (event) {
				trackBlurEvent(event);
			});
		}
	}

	/**
	 * Add selection event listeners to an element
	 * @param {string} elementId - ID of the element
	 * @private
	 */
	function addSelectionEvent(elementId) {
		const element = document.getElementById(elementId);
		if (element !== undefined && element !== null) {
			element.addEventListener('change', function (event) {
				trackOnChangeSelectionEvent(event);
			});
			element.addEventListener('click', function (event) {
				trackOnClickSelectionEvent(event);
			});
		}
	}

	/**
	 * Track an event with associated event data
	 * @param {number} eventType - Type of event
	 * @param {Event} event - Browser event object
	 * @private
	 */
	function trackWithEvent(eventType, event) {
		if (trackingOn) {
			trackEventOverElement(eventType, -1, event);
		}
	}

	/**
	 * Track a simple event without additional data
	 * @param {number} eventType - Type of event
	 * @private
	 */
	function trackEvent(eventType) {
		if (trackingOn) {
			trackEventOverElement(eventType, -1, null);
		}
	}

	/**
	 * Track an event over a specific element
	 * @param {number} eventType - Type of event
	 * @param {string|number} elementId - ID of element or -1
	 * @param {Event|null} event - Browser event object or null
	 * @private
	 */
	function trackEventOverElement(eventType, elementId, event) {
		const item = new Object();
		item.id = eventCounter++;
		item.sceneId = sceneId;
		item.eventType = eventType;
		item.timeStamp = Date.now();

		if (window.event !== undefined) {
			item.x = window.event.clientX;
			item.y = window.event.clientY;
		} else {
			item.x = 0;
			item.y = 0;
		}

		if (item.x == null) {
			item.x = -1;
		}
		if (item.y == null) {
			item.y = -1;
		}

		item.keyValueEvent = -1;
		item.keyCodeEvent = -1;

		if (eventType == EVENT_KEY_DOWN || eventType == EVENT_KEY_PRESS || eventType == EVENT_KEY_UP) {
			item.keyValueEvent = event.key;
			item.keyCodeEvent = event.keyCode;
			item.elementId = detectElementByName(event.target.id);
		} else if (eventType == EVENT_FOCUS || eventType == EVENT_BLUR) {
			item.elementId = detectElementByName(event.target.id);
		} else if (eventType == EVENT_ON_CHANGE_SELECTION_OBJECT) {
			item.elementId = detectElementByName(event.target.id);
		} else if (eventType == EVENT_ON_CLICK_SELECTION_OBJECT) {
			item.elementId = detectElementByName(event.target.id);
		} else {
			item.elementId = detectElement(item.x, item.y);
		}

		list[list.length] = item;

		if (list.length >= TOP_LIMIT) {
			const deliverPackage = list;
			list = [];
			deliverData(deliverPackage);
		}
	}

	/**
	 * Check if ready to leave the page
	 * @private
	 */
	function checkReadyToLeave() {
		if (eventsDelivered == false || pendingRequest > 0) {
			console.log("Not ready to leave page, events still pending");
		} else {
			// Events are delivered, we wait for the background delivery
			if (pendingBackgroundsDelivered > 0) {
				console.log("Not ready to leave page, " + pendingBackgroundsDelivered + " backgrounds still pending");
				setTimeout(() => {
					checkReadyToLeave();
				}, 2000);
				return;
			}

			console.log("Ready to leave page, pending request:" + pendingRequest + ", pending backgrounds " + pendingBackgroundsDelivered + "/" + backgroundsDelivered);
			if (finishedExperiment) {
				// We delete the user
				console.log("Experiment finished, deleting user " + localStorage.getItem("user"));
				localStorage.removeItem("user");
			}
			if (newPage != null) {
				window.location.href = newPage;
			}
		}
	}

	/**
	 * Deliver a chunk of tracking data to the server
	 * @param {Array} chunk - Array of events to deliver
	 * @private
	 */
	function deliverChunk(chunk) {
		const parametros = {
			"timezone": (new Date()).getTimezoneOffset() / 60 * (-1),
			"list": chunk,
			"idExperiment": idExperiment,
			"sessionId": user
		};

		if (emittingData) {
			$.ajax({
				data: JSON.stringify(parametros),
				url: url,
				type: 'post',
				beforeSend: function () {
					pendingRequest++;
					sentRequest++;
					console.log("Sending request. Pending requests: " + pendingRequest + "/" + sentRequest);
				},
				success: function (response) {
					console.log('Result: ' + response);
					console.log("Pending Requests: " + pendingRequest + "/" + sentRequest);
				},
				complete: function (jqXHR, textStatus) {
					pendingRequest--;
					console.log("Call completed. Status: " + textStatus + ", Pending Requests: " + pendingRequest + "/" + sentRequest);

					if (pendingRequest == 0) {
						eventsDelivered = true;
					}
					checkReadyToLeave();
				},
				error: function (XMLHttpRequest, textStatus, errorThrown) {
					console.log("Status: " + textStatus);
					console.log("Error: " + errorThrown);
				}
			});
		}
	}

	/**
	 * Deliver tracking data to the server in chunks
	 * @param {Array} dataList - Array of events to deliver
	 * @private
	 */
	function deliverData(dataList) {
		let i = 0;
		let chunk = [];
		let chunkCounter = 0;

		dataList.forEach(function myFunction(item) {
			chunk[i] = item;
			i++;
			if (i >= TOP_LIMIT) {
				i = 0;
				deliverChunk(chunk);
				chunkCounter++;
				chunk = [];
			}
		});

		deliverChunk(chunk);
		chunkCounter++;
		chunk = [];
	}

	/**
	 * Take a snapshot of the current page
	 * @param {number} sceneId - ID of the current scene
	 * @private
	 */
	function takeSnapshot(sceneId) {
		if (typeof html2canvas !== 'undefined') {
			html2canvas(document.body).then(canvas => {
				console.log("Delivering background for scene " + sceneId);
				deliverSnapshot(sceneId, canvas);
			});
		} else {
			console.log("html2canvas not available for taking snapshot");
		}
	}

	/**
	 * Deliver a snapshot to the server
	 * @param {number} sceneId - ID of the current scene
	 * @param {HTMLCanvasElement} canvas - Canvas with the snapshot
	 * @private
	 */
	function deliverSnapshot(sceneId, canvas) {
		const parametros = {
			"timezone": (new Date()).getTimezoneOffset() / 60 * (-1),
			"experiment": idExperiment,
			"sceneId": sceneId,
			"canvas": canvas.toDataURL("image/png"),
			"timeStamp": Date.now(),
			"sessionId": user
		};

		if (emittingData) {
			$.ajax({
				data: JSON.stringify(parametros),
				url: urlBackgroundTracker,
				type: 'post',
				beforeSend: function () {
					pendingBackgroundsDelivered++;
					console.log("Sending background. Pending backgrounds: " + pendingBackgroundsDelivered + "/" + sentRequest);
				},
				success: function (response) {
					pendingBackgroundsDelivered--;
					backgroundsDelivered++;
					console.log('Result: ' + response);
					console.log("Pending Backgrounds: " + pendingBackgroundsDelivered + "/" + sentRequest);
				},
				complete: function (jqXHR, textStatus) {
					console.log("Call completed. Status: " + textStatus + ", Pending Requests: " + pendingRequest + "/" + sentRequest);
				},
				error: function (XMLHttpRequest, textStatus, errorThrown) {
					console.log("Status: " + textStatus);
					console.log("Error: " + errorThrown);
				}
			});
		}
	}

	/**
	 * Get the experiment status from the server
	 * @private
	 */
	function getExperimentStatus() {
		$.ajax({
			url: urlExperimentStatus,
			type: 'get',
			success: function (response) {
				if (response === 'OPEN') {
					emittingData = true;
				} else {
					emittingData = false;
				}
			},
			error: function () {
				console.log("Error getting experiment status");
			}
		});
	}

	/**
	 * Set up event listeners for tracking mouse movement
	 * @private
	 */
	function trackMouseMovement() {
		trackEvent(EVENT_ON_MOUSE_MOVE);
	}

	/**
	 * Set up event listeners for tracking clicks
	 * @private
	 */
	function trackClick() {
		trackEvent(EVENT_ON_CLICK);
	}

	/**
	 * Set up event listeners for tracking double clicks
	 * @private
	 */
	function trackDblclick() {
		trackEvent(EVENT_ON_DOUBLE_CLICK);
	}

	/**
	 * Set up event listeners for tracking mouse down events
	 * @private
	 */
	function trackMouseDown() {
		trackEvent(EVENT_ON_MOUSE_DOWN);
	}

	/**
	 * Set up event listeners for tracking mouse up events
	 * @private
	 */
	function trackMouseUp() {
		trackEvent(EVENT_ON_MOUSE_UP);
	}

	/**
	 * Set up event listeners for tracking wheel events
	 * @private
	 */
	function trackWheel() {
		trackEvent(EVENT_ON_WHEEL);
	}

	/**
	 * Set up event listeners for tracking context menu events
	 * @private
	 */
	function trackContextmenu() {
		trackEvent(EVENT_CONTEXT_MENU);
	}

	/**
	 * Set up event listeners for tracking window scroll events
	 * @private
	 */
	function trackWindowScroll() {
		trackEvent(EVENT_WINDOW_SCROLL);
	}

	/**
	 * Set up event listeners for tracking window resize events
	 * @private
	 */
	function trackWindowResize() {
		trackEvent(EVENT_WINDOW_RESIZE);
	}

	/**
	 * Set up event listeners for tracking key down events
	 * @param {Event} event - The key event
	 * @private
	 */
	function trackEventKeydown(event) {
		trackWithEvent(EVENT_KEY_DOWN, event);
	}

	/**
	 * Set up event listeners for tracking key press events
	 * @param {Event} event - The key event
	 * @private
	 */
	function trackEventKeypress(event) {
		trackWithEvent(EVENT_KEY_PRESS, event);
	}

	/**
	 * Set up event listeners for tracking key up events
	 * @param {Event} event - The key event
	 * @private
	 */
	function trackEventKeyup(event) {
		trackWithEvent(EVENT_KEY_UP, event);
	}

	/**
	 * Set up event listeners for tracking focus events
	 * @param {Event} event - The focus event
	 * @private
	 */
	function trackFocusEvent(event) {
		trackWithEvent(EVENT_FOCUS, event);
	}

	/**
	 * Set up event listeners for tracking blur events
	 * @param {Event} event - The blur event
	 * @private
	 */
	function trackBlurEvent(event) {
		trackWithEvent(EVENT_BLUR, event);
	}

	/**
	 * Set up event listeners for tracking selection change events
	 * @param {Event} event - The change event
	 * @private
	 */
	function trackOnChangeSelectionEvent(event) {
		trackWithEvent(EVENT_ON_CHANGE_SELECTION_OBJECT, event);
	}

	/**
	 * Set up event listeners for tracking selection click events
	 * @param {Event} event - The click event
	 * @private
	 */
	function trackOnClickSelectionEvent(event) {
		trackWithEvent(EVENT_ON_CLICK_SELECTION_OBJECT, event);
	}

	/**
	 * Post demographic data to the server
	 * @param {Object} parametros - Data to post
	 * @private
	 */
	function postAJAXDemographicData(parametros) {
		if (emittingData) {
			$.ajax({
				data: JSON.stringify(parametros),
				url: urlDemographicData,
				type: 'post',
				success: function (response) {
					// Success handler
				},
				error: function () {
					// Error handler
				}
			});
		}
	}

	// Public API
	return {
		/**
		 * Initialize the module
		 */
		init: function () {
			// Initialize the user
			user = createUser();
			console.log("Initialized InteractionLab Heuristics module with user ID: " + user);
		},

		/**
		 * Start a new experiment session
		 */
		startExperiment: function () {
			user = createUser();
			console.log("Creating user session " + user);
		},

		/**
		 * Finish the current experiment
		 */
		finishExperiment: function () {
			finishedExperiment = true;
		},

		/**
		 * Initialize tracking for a scene
		 * @param {number} _sceneId - ID of the scene to track
		 */
		initTracking: function (_sceneId) {
			trackingOn = true;
			getExperimentStatus();
			sceneId = _sceneId;
			console.log("Initializing tracking for scene " + _sceneId);

			trackEvent(EVENT_INIT_TRACKING);

			// Set up global event listeners
			window.addEventListener('scroll', trackWindowScroll);
			window.addEventListener('resize', trackWindowResize);
			window.addEventListener('mousemove', trackMouseMovement);
			window.addEventListener('mousedown', trackMouseDown);
			window.addEventListener('mouseup', trackMouseUp);
			window.addEventListener('click', trackClick);
			window.addEventListener('dblclick', trackDblclick);
			window.addEventListener('contextmenu', trackContextmenu);
			window.addEventListener('wheel', trackWheel);
			window.addEventListener('keydown', trackEventKeydown);
			window.addEventListener('keypress', trackEventKeypress);
			window.addEventListener('keyup', trackEventKeyup);
		},

		/**
		 * Finish tracking and optionally navigate to a new page
		 * @param {string|null} _newPage - URL to navigate to after tracking is finished
		 */
		finishTracking: function (_newPage) {
			trackEvent(EVENT_TRACKIND_END);
			trackingOn = false;

			// Take a snapshot of the page
			takeSnapshot(sceneId);

			deliverData(list);
			list = [];
			newPage = _newPage;
			checkReadyToLeave();
		},

		/**
		 * Finish tracking for a subscene
		 */
		finishSubsceneTracking: function () {
			trackEvent(EVENT_TRACKIND_END);
			trackingOn = false;
			takeSnapshot(sceneId);
		},

		/**
		 * Register a UI component for tracking
		 * @param {number} sceneId - ID of the scene this component belongs to
		 * @param {string} componentId - ID of the component
		 * @param {number} x - X coordinate of top-left corner
		 * @param {number} y - Y coordinate of top-left corner
		 * @param {number} xF - X coordinate of bottom-right corner
		 * @param {number} yF - Y coordinate of bottom-right corner
		 * @param {number} typeId - Type of component
		 * @param {string} componentAssociated - ID of associated component
		 */
		registerComponent: function (sceneId, componentId, x, y, xF, yF, typeId, componentAssociated) {
			// Create element for tracking
			elements.push(new Element(componentId, x, y, xF, yF, sceneId));
			addFocusAndBlurEvents(componentId);

			if (typeId === COMPONENT_COMBOBOX || typeId === COMPONENT_OPTION) {
				addSelectionEvent(componentId);
			}

			// Register with server
			const parametros = {
				"timezone": (new Date()).getTimezoneOffset() / 60 * (-1),
				"sceneId": sceneId,
				"componentId": componentId,
				"x": Math.round(x),
				"y": Math.round(y),
				"xF": Math.round(xF),
				"yF": Math.round(yF),
				"timeStamp": Date.now(),
				"idExperiment": idExperiment,
				"typeId": typeId,
				"componentAssociated": componentAssociated,
				"sessionId": user
			};

			if (emittingData) {
				$.ajax({
					data: JSON.stringify(parametros),
					url: urlRegisterComponent,
					type: 'post',
					beforeSend: function () {
						// Before send handler
					},
					success: function (response) {
						// Success handler
					}
				});
			}
		},

		/**
		 * Register user data with the server
		 */
		registerUserData: function () {
			const parametros = {
				"timezone": (new Date()).getTimezoneOffset() / 60 * (-1),
				"timeOpened": new Date(),
				"pageon": window.location.pathname,
				"referrer": document.referrer,
				"previousSites": history.length,
				"browserName": navigator.appName,
				"browserEngine": navigator.product,
				"browserVersion1a": navigator.appVersion,
				"browserVersion1b": navigator.userAgent,
				"browserLanguage": navigator.language,
				"browserOnline": navigator.onLine,
				"browserPlatform": navigator.platform,
				"javaEnabled": navigator.javaEnabled(),
				"dataCookiesEnabled": navigator.cookieEnabled,
				"dataCookies1": document.cookie,
				"dataCookies2": decodeURIComponent(document.cookie.split(";")),
				"sizeScreenW": screen.width,
				"sizeScreenH": screen.height,
				"sizeDocW": document.body.clientWidth,
				"sizeDocH": document.body.clientHeight,
				"sizeInW": innerWidth,
				"sizeInH": innerHeight,
				"sizeAvailW": screen.availWidth,
				"sizeAvailH": screen.availHeight,
				"scrColorDepth": screen.colorDepth,
				"scrPixelDepth": screen.pixelDepth,
				"idExperiment": idExperiment,
				"sessionId": user
			};

			if (emittingData) {
				$.ajax({
					data: JSON.stringify(parametros),
					url: urlRegisterUserData,
					type: 'post',
					beforeSend: function () {
						if (document.getElementById("resultado")) {
							document.getElementById("resultado").innerHTML = "Registering user data...";
						}
					},
					success: function (response) {
						if (document.getElementById("result")) {
							document.getElementById("result").innerHTML = response;
						}
					},
					async: false
				});
			}
		},

		/**
		 * Post numeric demographic data
		 * @param {number} id - ID of the demographic field
		 * @param {number} value - Numeric value to post
		 */
		postNumberDD: function (id, value) {
			const parametros = {
				"timezone": (new Date()).getTimezoneOffset() / 60 * (-1),
				"id": id,
				"numberValue": value,
				"idExperiment": idExperiment,
				"sessionId": user
			};
			postAJAXDemographicData(parametros);
		},

		/**
		 * Post string demographic data
		 * @param {number} id - ID of the demographic field
		 * @param {string} value - String value to post
		 */
		postStringDD: function (id, value) {
			const parametros = {
				"timezone": (new Date()).getTimezoneOffset() / 60 * (-1),
				"id": id,
				"stringValue": value,
				"idExperiment": idExperiment,
				"sessionId": user
			};
			postAJAXDemographicData(parametros);
		},

		/**
		 * Post date demographic data
		 * @param {number} id - ID of the demographic field
		 * @param {string} value - Date value to post
		 */
		postDateDD: function (id, value) {
			const parametros = {
				"timezone": (new Date()).getTimezoneOffset() / 60 * (-1),
				"id": id,
				"dateValue": value,
				"idExperiment": idExperiment,
				"sessionId": user
			};
			postAJAXDemographicData(parametros);
		},

		/**
		 * Register an identifier with the system
		 * @param {string} value - Identifier value
		 */
		registeridentificador: function (value) {
			this.postStringDD(29, value);
		},

		/**
		 * Get the current user ID
		 * @returns {string} The user ID
		 */
		getUserId: function () {
			return user;
		},

		/**
		 * Get the current experiment ID
		 * @returns {number} The experiment ID
		 */
		getExperimentId: function () {
			return idExperiment;
		},

		// Export constants for external use
		EVENT_TYPES: {
			MOUSE_MOVE: EVENT_ON_MOUSE_MOVE,
			CLICK: EVENT_ON_CLICK,
			DOUBLE_CLICK: EVENT_ON_DOUBLE_CLICK,
			MOUSE_DOWN: EVENT_ON_MOUSE_DOWN,
			MOUSE_UP: EVENT_ON_MOUSE_UP,
			WHEEL: EVENT_ON_WHEEL,
			CONTEXT_MENU: EVENT_CONTEXT_MENU,
			WINDOW_SCROLL: EVENT_WINDOW_SCROLL,
			WINDOW_RESIZE: EVENT_WINDOW_RESIZE,
			KEY_DOWN: EVENT_KEY_DOWN,
			KEY_PRESS: EVENT_KEY_PRESS,
			KEY_UP: EVENT_KEY_UP,
			FOCUS: EVENT_FOCUS,
			BLUR: EVENT_BLUR,
			CHANGE_SELECTION: EVENT_ON_CHANGE_SELECTION_OBJECT,
			CLICK_SELECTION: EVENT_ON_CLICK_SELECTION_OBJECT,
			INIT_TRACKING: EVENT_INIT_TRACKING,
			END_TRACKING: EVENT_TRACKIND_END
		},

		COMPONENT_TYPES: {
			TEXT_FIELD: COMPONENT_TEXT_FIELD,
			COMBOBOX: COMPONENT_COMBOBOX,
			OPTION: COMPONENT_OPTION,
			RADIO_BUTTON: COMPONENT_RADIO_BUTTON,
			CHECK_BOX: COMPONENT_CHECK_BOX
		}
	};
})();

// Initialize the module
//InteractionLabHeuristics.init();

// Export the module
export default InteractionLabHeuristics;