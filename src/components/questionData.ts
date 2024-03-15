// Contains types that describe Question and Answer data

export type qData = {
	qName: string; //for analytics event
	qNumber: number; //for analytics event
	qTarget: string; //for analytics event
	promptText: string; //for display
	promptImg?: string;
	promptAudio?: string;
	answers: answerData[];
	correct?: string;
	bucket?: number;
}

export type answerData = {
	answerName: string; //for analytics event
	answerText?: string; //for display
	answerImg?: string;
}
