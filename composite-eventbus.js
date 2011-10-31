/**
 * mock console object
 */
if (typeof getConsole != 'function') {
	function getConsole() {
		this.info = function() {};
		this.warn = function() {};
		this.error = function() {};
		
		return this;
	}
}

/** simple event bus for publishing/subcribing information */
var EventBus = (function() {
	var self = this;
	
	/** registered subscribers */
	this.registrations = {};

	/**
	 * subscribe to given topic.
	 * 
	 * @param string
	 *            topic/event name
	 * 
	 * @param function
	 *            callback - if no callback is given, subscription is not added
	 */
	this.subscribe = function(topic, callback) {
		var _callback = callback;
		
		if (topic.constructor.toString().indexOf("Array") != -1) {
			for (idx in topic) {
				self.subscribe(topic[idx], _callback);
			}
		}
		
		// need callback
		if (typeof callback !== 'function') {
			return;
		}

		var topicData = this.getTopicData(topic);
		var topic = topicData.topic;
		var events = topicData.events;

		getConsole().info(
				"[eventbus] new subscribtion for topic '" + topic
						+ ((events) ? ('->' + events + "'") : "'"));

		// no topic? create a new one
		if (!this.registrations[topic]) {
			this.registrations[topic] = {
				topic : topic,
				subscribersForEvent : {},
				subscribers : []
			};
		}

		var registeredTopic = this.registrations[topic];

		// subscribe to special event
		if (events) {
			var event;

			for (idx in events) {
				event = events[idx];
				// subscribeForEvent
				var sfe = registeredTopic.subscribersForEvent[event];

				// event must be added
				if (!sfe) {
					sfe = registeredTopic.subscribersForEvent[event] = [];
				}

				// push callback to special event
				sfe.push(callback);
			}
		} else {
			registeredTopic.subscribers.push(callback);
		}
	};

	/**
	 * splits topic data
	 * 
	 * @param string
	 *            topic name of topic to subscribe to. Could be 'composite',
	 *            'composite:event', 'composite:*', composite:event1,event2,...'
	 * @return object
	 */
	this.getTopicData = function(topic) {
		var r = {
			"topic" : topic,
			"events" : undefined
		};

		var idxSeperator = topic.indexOf(":");

		if (idxSeperator >= 0) {
			r.events = [];
			eventsToParse = topic.substr(idxSeperator + 1);
			r.topic = topic.substr(0, idxSeperator);

			var eventsToParse = eventsToParse.split(",");
			var eventname;

			for (idx in eventsToParse) {
				eventname = jQuery.trim(eventsToParse[idx]);

				if (eventname == '*') {
					r.events = undefined;
					break;
				}

				if (eventname.length == 0) {
					continue;
				}

				r.events.push(eventname);
			}

			if (r.events != undefined && r.events.length == 0) {
				r.events = undefined;
			}
		}

		return r;
	};

	/**
	 * publish a message to topic
	 * 
	 * @param string
	 *            topic name
	 * @param object
	 *            payload
	 */
	this.publish = function(topic, payload) {
		var topicData = this.getTopicData(topic);
		var topic = topicData.topic;
		var events = topicData.events;

		getConsole().info(
				"[eventbus] new publishment on topic '" + topic
						+ ((events) ? ('->' + events) : "") + "': ", payload);

		// no subscribers
		if (!this.registrations[topic]) {
			getConsole().warn(
					"[eventbus] no registrations for topic '" + topic + "'");
			return;
		}

		// notify special event listeners
		if (events != undefined) {
			var eventname;

			for (idx in events) {
				eventname = events[idx];
				if (this.registrations[topic].subscribersForEvent[eventname]) {
					for (idx in this.registrations[topic].subscribersForEvent[eventname]) {
						this.registrations[topic].subscribersForEvent[eventname][idx]
								(payload, topic, eventname);
					}
				}
			}
		}

		// notify all subscribers to this topic
		for (idx in this.registrations[topic].subscribers) {
			this.registrations[topic].subscribers[idx](payload, topic, events);
		}
	};

	return this;
})();

/**
 * composite manager which controls all components in this application
 */
var CompositeManager = (function() {
	var self = this;
	this.components = {};

	/**
	 * register a new component
	 * 
	 * @param string
	 *            name of component
	 * @param object
	 *            instance of component
	 * @return object instance with injected event bus and composite manager
	 */
	this.register = function(name, clazz) {
		this.components[name] = clazz;
		clazz.eventBus = EventBus;
		clazz.compositeManager = self;

		return clazz;
	};

	/**
	 * find component by name
	 * 
	 * @param string
	 *            name
	 * @return object
	 */
	this.find = function(name) {
		if (!self.components[name]) {
			getConsole().error(
					"[compositemanager] no component with name '" + name + "'");
			return;
		}

		return self.components[name];
	};

	/**
	 * returns all registered components
	 * 
	 * @return array
	 */
	this.all = function() {
		return self.components;
	};

	return this;
})();