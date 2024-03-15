// this is where we can have the classes and functions for building the events
// to send to an analytics recorder (firebase? lrs?)

import { qData, answerData } from './questionData';
import { logEvent } from 'firebase/analytics';
import { bucket } from '../assessment/bucketData'

var uuid: string;
var userSource: string;
var clat, clon;
var gana;
var latlong;
var croppedlat, croppedlong;
var city, region, country;
var dataURL;

export function getLocation(){
	console.log("starting to get location");
		fetch(`https://ipinfo.io/json?token=b6268727178610`)
		.then((response) => {
			console.log("got location response");
				if(!response.ok) {
					throw Error(response.statusText);
				}
			return response.json()
		}).then((jsonResponse)  => {
			console.log(jsonResponse);
			latlong = jsonResponse.loc;
			city = jsonResponse.city;
			region = jsonResponse.region;
			country = jsonResponse.country;
			sendLocation();

				return {};
		}).catch((err) => {
			console.warn(`location failed to update! encountered error ${err.msg}`);
		});

}


export function linkAnalytics(newgana, dataurl): void{
	gana = newgana;
	dataURL = dataurl;
}

export function setUuid(newUuid: string, newUserSource: string): void {
	uuid = newUuid;
	userSource = newUserSource;
}


export function sendInit(): void {
	getLocation();
	var eventString = "user " + uuid + " opened the assessment"

	console.log(eventString);

	logEvent(gana,"opened", {

	});
}

export function getAppLanguageFromDataURL(appType: string): string {
	// Check if app type is not empty and split the string by the hyphen then return the first element
	if (appType && appType !== "" && appType.includes("-")) {
		return appType.split("-")[0];
	}

	return "NotAvailable";
}

export function getAppTypeFromDataURL(appType: string): string {
	// Check if app type is not empty and split the string by the hyphen then return the last element
	if (appType && appType !== "" && appType.includes("-")) {
		return appType.split("-")[1];
	}

	return "NotAvailable";
}

export function sendLocation(): void{
	var lpieces = latlong.split(",");
	var lat = parseFloat(lpieces[0]).toFixed(2);
	var lon = parseFloat(lpieces[1]).toFixed(1);
	clat = lat;
	clon = lon;
	latlong = "";
	lpieces = [];


	var eventString = "user " + uuid + " is at location " + lat + "," + lon;
	console.log(eventString);

	logEvent(gana,"user_location", {
		user: uuid,
		language: getAppLanguageFromDataURL(dataURL),
		app: getAppTypeFromDataURL(dataURL),
		lat: lat,
		lon: lon
	});

	console.log("INITIALIZED EVENT SENT");
	console.log("App Language: " + getAppLanguageFromDataURL(dataURL));
	console.log("App Type: " + getAppTypeFromDataURL(dataURL));

	logEvent(gana,"initialized", {
		type: "initialized",
		clUserId: uuid,
		userSource: userSource,
		lat: clat,
		lon: clon,
		city: city,
		region: region,
		country: country,
		app: getAppTypeFromDataURL(dataURL),
		language: getAppLanguageFromDataURL(dataURL)
	});

}


export function sendAnswered(theQ: qData, theA: number, elapsed: number): void {
	var ans = theQ.answers[theA - 1];

	var iscorrect = null;
	var bucket = null;
	if ("correct" in theQ){
		if (theQ.correct != null){
			if (theQ.correct == ans.answerName){
				iscorrect = true;
			}
			else{
				iscorrect = false;
			}
		}
	}
	if ("bucket" in theQ){
		bucket = theQ.bucket;
	}
	var eventString = "user " + uuid + " answered " + theQ.qName + " with " + ans.answerName;
	eventString += ", all answers were [";
	var opts = "";
	for (var aNum in theQ.answers) {
		eventString += theQ.answers[aNum].answerName + ",";
		opts += theQ.answers[aNum].answerName + ",";

	}
	eventString += "] ";
	eventString += iscorrect;
	eventString += bucket;
	console.log(eventString);

	logEvent(gana,"answered", {
		type: "answered",
		clUserId: uuid,
		userSource: userSource,
		lat: clat,
		lon: clon,
		city: city,
		region: region,
		country: country,
		app: getAppTypeFromDataURL(dataURL),
		language: getAppLanguageFromDataURL(dataURL),
		dt: elapsed,
		question_number: theQ.qNumber,
		target: theQ.qTarget,
		question: theQ.promptText,
		selected_answer: ans.answerName,
		iscorrect: iscorrect,
		options: opts,
		bucket: bucket
	});

}

export function sendBucket(tb: bucket, passed: boolean): void {
	var bn = tb.bucketID;
	var btried = tb.numTried;
	var bcorrect = tb.numCorrect;
	var eventString = "user " + uuid + " finished the bucket " + bn;
	console.log(eventString);
	logEvent(gana,"bucketCompleted", {
		type: "bucketCompleted",
		clUserId: uuid,
		userSource: userSource,
		lat: clat,
		lon: clon,
		city: city,
		region: region,
		country: country,
		app: getAppTypeFromDataURL(dataURL),
		language: getAppLanguageFromDataURL(dataURL),
		bucketNumber: bn,
		numberTriedInBucket:btried,
		numberCorrectInBucket:bcorrect,
		passedBucket: passed
	});
}

export function sendFinished(buckets: bucket[] = null): void {
	let eventString = "user " + uuid + " finished the assessment";
	console.log(eventString);

	let basalBucketID = getBasalBucketID(buckets);
	let ceilingBucketID = getCeilingBucketID(buckets);

	if (basalBucketID == 0) {
		basalBucketID = ceilingBucketID;
	}

	let score = calculateScore(buckets, basalBucketID);
	const maxScore = buckets.length * 100;

	console.log("Sending completed event");
	console.log("Score: " + score);
	console.log("Max Score: " + maxScore);
	console.log("Basal Bucket: " + basalBucketID);
	console.log("Ceiling Bucket: " + ceilingBucketID);

	logEvent(gana,"completed", {
		type: "completed",
		clUserId: uuid,
		userSource: userSource,
		app: getAppTypeFromDataURL(dataURL),
		language: getAppLanguageFromDataURL(dataURL),
		lat: clat,
		lon: clon,
		city: city,
		region: region,
		country: country,
		score: score,
		maxScore: maxScore,
		basalBucket: basalBucketID,
		ceilingBucket: ceilingBucketID
	});
}

function calculateScore(buckets: bucket[], basalBucketID: number): number {
	console.log("Calculating score");
	console.log(buckets);
	
	let score = 0;

	console.log("Basal Bucket ID: " + basalBucketID);

	// Get the numcorrect from the basal bucket based on looping through and finding the bucket id
	let numCorrect = 0;

	for (const index in buckets) {
		const bucket = buckets[index];
		if (bucket.bucketID == basalBucketID) {
			numCorrect = bucket.numCorrect;
			break;
		}
	}
	
	score = Math.round(((basalBucketID - 1) * 100) + (numCorrect / 5) * 100) | 0;

	return score;
}

function getBasalBucketID(buckets: bucket[]): number {
	let bucketID = 0;
	
	// Select the lowest bucketID bucket that the user has failed
	for (const index in buckets) {
		const bucket = buckets[index];
		if (bucket.tested && !bucket.passed) {
			if (bucketID == 0 || bucket.bucketID < bucketID) {
				bucketID = bucket.bucketID;
			}
		}
	}

	return bucketID;
}

function getCeilingBucketID(buckets: bucket[]): number {
	let bucketID = 0;
	
	// Select the hiughest bucketID bucket that the user has passed
	for (const index in buckets) {
		const bucket = buckets[index];
		if (bucket.tested && bucket.passed) {
			if (bucketID == 0 || bucket.bucketID > bucketID) {
				bucketID = bucket.bucketID;
			}
		}
	}

	return bucketID;
}