// Contains types that describe Bucket and Bucket Item

export type bucket = {
	bucketID: number;
	items: bucketItem[];
	usedItems: bucketItem[];
	bucketName?: string; //for analytics
	numTried: number ;
	numCorrect: number ;
	numConsecutiveWrong: number;
	tested: boolean;
	score: number;
	passed: boolean;
}

export type bucketItem = {
	itemName: string;
	itemText: string;
	itemAudio?: string;
	itemImg?: string;
}
