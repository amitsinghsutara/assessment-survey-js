//this is where the logic for handling the buckets will go
//
//once we start adding in the assessment functionality
import { UIController } from '../components/uiController';
import { qData, answerData } from '../components/questionData';
import { AnalyticsEvents } from '../components/analyticsEvents'
import { App } from '../App';
import { bucket, bucketItem } from './bucketData';
import { BaseQuiz } from '../BaseQuiz';
import { fetchAssessmentBuckets } from '../components/jsonUtils';
import { TreeNode, sortedArrayToIDsBST } from '../components/tNode';
import { randFrom, shuffleArray } from '../components/mathUtils';
import { AudioController } from '../components/audioController';

enum searchStage {
	BinarySearch,
	LinearSearchUp,
	LinearSearchDown
}

enum BucketGenMode {
	RandomBST,
	LinearArrayBased,
}

export class Assessment extends BaseQuiz {

	public unityBridge;

	public currentNode: TreeNode;
	public currentQuestion: qData;
	public bucketArray: number[];
	public questionNumber: number;
	
	public buckets: bucket[];
	public currentBucket: bucket;
	public numBuckets: number;
	public basalBucket: number;
	public ceilingBucket: number;

	public currentLinearBucketIndex: number;
	public currentLinearTargetIndex: number;

	protected bucketGenMode: BucketGenMode = BucketGenMode.RandomBST;

	private MAX_STARS_COUNT_IN_LINEAR_MODE = 20;

	constructor(dataURL: string, unityBridge: any) {
		super();
		this.dataURL = dataURL;
		this.unityBridge = unityBridge;
		this.questionNumber = 0;
		console.log("app initialized");
		UIController.SetButtonPressAction(this.TryAnswer);
		UIController.SetStartAction(this.startAssessment);
	}

	public Run(applink: App): void {
		this.app = applink;
		this.buildBuckets(this.bucketGenMode).then(result => {
			console.log(this.currentBucket);
			this.unityBridge.SendLoaded();
		});
	}

	public handleBucketGenModeChange(event: Event): void {
		// TODO: Implement handleBucketGenModeChange
		this.bucketGenMode = parseInt(this.devModeBucketGenSelect.value) as BucketGenMode;
		this.buildBuckets(this.bucketGenMode).then(() => {
			// Finished building buckets
		});
	}

	public handleCorrectLabelShownChange(): void {
		UIController.getInstance().SetCorrectLabelVisibility(this.isCorrectLabelShown);
	}

	public startAssessment = () => {
		UIController.ReadyForNext(this.getNextQuestion());
		if (this.isInDevMode) {
			this.hideDevModeButton();
		}
	}

	public buildBuckets = async (bucketGenMode: BucketGenMode) => {
		// If we don't have the buckets loaded, load them and initialize the current node, which is the starting point
		if (this.buckets === undefined || this.buckets.length === 0) {
			var res = fetchAssessmentBuckets(this.app.GetDataURL()).then((result) => {
				this.buckets = result;
				this.numBuckets = result.length;
				console.log("buckets: " + this.buckets);
				this.bucketArray = Array.from(Array(this.numBuckets), (_, i) => i+1);
				console.log("empty array " +  this.bucketArray);
				let usedIndices = new Set<number>();
				usedIndices.add(0);
				let rootOfIDs = sortedArrayToIDsBST(this.buckets[0].bucketID - 1, this.buckets[this.buckets.length - 1].bucketID, usedIndices);
				// console.log("Generated the buckets root ----------------------------------------------");
				// console.log(rootOfIDs);
				let bucketsRoot = this.convertToBucketBST(rootOfIDs, this.buckets);
				console.log("Generated the buckets root ----------------------------------------------");
				console.log(bucketsRoot);
				this.basalBucket = this.numBuckets + 1;
				this.ceilingBucket = -1;
				this.currentNode = bucketsRoot;
				this.tryMoveBucket(false);
			});
			return res;
		} else {
			if (bucketGenMode === BucketGenMode.RandomBST) {
				// If we have the buckets loaded, we can initialize the current node, which is the starting point
				return new Promise<void>((resolve, reject) => {
					let usedIndices = new Set<number>();
					usedIndices.add(0);
					let rootOfIDs = sortedArrayToIDsBST(this.buckets[0].bucketID - 1, this.buckets[this.buckets.length - 1].bucketID, usedIndices);
					// console.log("Generated the buckets root ----------------------------------------------");
					// console.log(rootOfIDs);
					let bucketsRoot = this.convertToBucketBST(rootOfIDs, this.buckets);
					console.log("Generated the buckets root ----------------------------------------------");
					console.log(bucketsRoot);
					this.basalBucket = this.numBuckets + 1;
					this.ceilingBucket = -1;
					this.currentNode = bucketsRoot;
					this.tryMoveBucket(false);
					resolve();
				});
			} else if (bucketGenMode === BucketGenMode.LinearArrayBased) {
				return new Promise<void>((resolve, reject) => {
					this.currentLinearBucketIndex = 0;
					this.currentLinearTargetIndex = 0;
					this.tryMoveBucket(false);
					resolve();
				});
			}
		}
	}

	/**
	 * Converts a binary search tree of numbers to a binary search tree of bucket objects
	 * @param node Is a root node of a binary search tree
	 * @param buckets Is an array of bucket objects
	 * @returns A root node of a binary search tree where the value of each node is a bucket object
	 */
	public convertToBucketBST = (node: TreeNode, buckets: bucket[]) => {
		// Traverse each element take the value and find that bucket in the buckets array and assign that bucket instead of the number value
		if (node === null) return node;

		let bucketId = node.value;
		node.value = buckets.find(bucket => bucket.bucketID === bucketId);
		if (node.left !== null) node.left = this.convertToBucketBST(node.left, buckets);
		if (node.right !== null) node.right = this.convertToBucketBST(node.right, buckets);

		return node;
	}

	public initBucket = (bucket: bucket) => {
		this.currentBucket = bucket;
		this.currentBucket.usedItems = [];
		this.currentBucket.numTried = 0;
		this.currentBucket.numCorrect = 0;
		this.currentBucket.numConsecutiveWrong = 0;
		this.currentBucket.tested = true;
		this.currentBucket.passed = false;
	}

	public TryAnswer = (answer: number, elapsed: number) => {
		if (this.bucketGenMode === BucketGenMode.RandomBST) {
			AnalyticsEvents.sendAnswered(this.currentQuestion, answer, elapsed);
		}
		this.currentBucket.numTried += 1;
		if (this.currentQuestion.answers[answer - 1].answerName == this.currentQuestion.correct){
			this.currentBucket.numCorrect += 1;
			this.currentBucket.numConsecutiveWrong = 0;
			console.log("Answered correctly");
		}else{
			this.currentBucket.numConsecutiveWrong += 1;
			console.log("Answered incorrectly, " + this.currentBucket.numConsecutiveWrong);
		}
		if (this.bucketGenMode === BucketGenMode.LinearArrayBased && UIController.getInstance().shownStarsCount < this.MAX_STARS_COUNT_IN_LINEAR_MODE) {
			UIController.AddStar();
		} else if (this.bucketGenMode === BucketGenMode.RandomBST) {
			UIController.AddStar();
		}
		UIController.SetFeedbackVisibile(true);
		setTimeout(() => { 
			console.log('Completed first Timeout');
			this.onQuestionEnd()
		}, 2000);
	}

	public onQuestionEnd = () => {
		let questionEndTimeout = (this.HasQuestionsLeft()) ? 500 : 4000;
	
		const endOperations = () => {
			UIController.SetFeedbackVisibile(false);
			if (this.bucketGenMode === BucketGenMode.LinearArrayBased && UIController.getInstance().shownStarsCount < this.MAX_STARS_COUNT_IN_LINEAR_MODE) {
				UIController.ChangeStarImageAfterAnimation();
			} else if (this.bucketGenMode === BucketGenMode.RandomBST) {
				UIController.ChangeStarImageAfterAnimation();
			}
			if (this.HasQuestionsLeft()) {
				if (this.bucketGenMode === BucketGenMode.LinearArrayBased) {
					if (this.currentLinearTargetIndex < this.buckets[this.currentLinearBucketIndex].items.length) {
						this.currentLinearTargetIndex++;
						// We need to reset the used items array when we move to the next question in linear mode
						this.currentBucket.usedItems = [];
					} 
					
					if (this.currentLinearTargetIndex >= this.buckets[this.currentLinearBucketIndex].items.length && this.currentLinearBucketIndex < this.buckets.length) {
						this.currentLinearBucketIndex++;
						this.currentLinearTargetIndex = 0;
						this.tryMoveBucket(false);
					}
				}

				UIController.ReadyForNext(this.getNextQuestion());
			} else {
				console.log("No questions left");
				this.onEnd();
			}
		};
	
		// Create a promise that resolves after the specified timeout
		const timeoutPromise = new Promise<void>(resolve => {
			setTimeout(() => {
				resolve();
			}, questionEndTimeout);
		});
	
		// Execute endOperations after timeoutPromise resolves
		timeoutPromise.then(() => {
			endOperations();
		});
	}
	

	public getNextQuestion = () => {
		if (this.bucketGenMode === BucketGenMode.LinearArrayBased && this.currentLinearTargetIndex >= this.buckets[this.currentLinearBucketIndex].items.length) {
			return null;
		}
		var targetItem, foil1, foil2, foil3;

		if (this.bucketGenMode === BucketGenMode.RandomBST) {
			do {
				targetItem = randFrom(this.currentBucket.items);
			} while (this.currentBucket.usedItems.includes(targetItem));

			this.currentBucket.usedItems.push(targetItem);

			do {
				foil1 = randFrom(this.currentBucket.items);
			} while (targetItem == foil1);

			do {
				foil2 = randFrom(this.currentBucket.items);
			} while (targetItem == foil2 || foil1 == foil2);

			do {
				foil3 = randFrom(this.currentBucket.items);
			} while (targetItem == foil3 || foil1 == foil3 || foil2 == foil3);

		} else if (this.bucketGenMode === BucketGenMode.LinearArrayBased) {
			// LinearArrayBased
			targetItem = this.buckets[this.currentLinearBucketIndex].items[this.currentLinearTargetIndex];
			this.currentBucket.usedItems.push(targetItem);

			// Generate random foils
			do {
				foil1 = randFrom(this.buckets[this.currentLinearBucketIndex].items);
			} while (targetItem == foil1);

			do {
				foil2 = randFrom(this.buckets[this.currentLinearBucketIndex].items);
			} while (targetItem == foil2 || foil1 == foil2);

			do {
				foil3 = randFrom(this.buckets[this.currentLinearBucketIndex].items);
			} while (targetItem == foil3 || foil1 == foil3 || foil2 == foil3);

		}
		
		let answerOptions = [targetItem, foil1, foil2, foil3];
		shuffleArray(answerOptions);

		var result = {
			qName: "question-" + this.questionNumber + "-" + targetItem.itemName,
			qNumber: this.questionNumber,
			qTarget: targetItem.itemName,
			promptText: "",
			bucket: this.currentBucket.bucketID,
			promptAudio: targetItem.itemName,
			correct: targetItem.itemText,
			answers: [
				{
					answerName: answerOptions[0].itemName,
					answerText: answerOptions[0].itemText
				},
				{
					answerName: answerOptions[1].itemName,
					answerText: answerOptions[1].itemText
				},
				{
					answerName: answerOptions[2].itemName,
					answerText: answerOptions[2].itemText
				},
				{
					answerName: answerOptions[3].itemName,
					answerText: answerOptions[3].itemText
				}
			]
		};

		this.currentQuestion = result;
		this.questionNumber += 1;
		return result;
	}

	public tryMoveBucket = (passed: boolean) => {
		if (this.bucketGenMode === BucketGenMode.RandomBST) {
			this.tryMoveBucketRandomBST(passed);
		} else if (this.bucketGenMode === BucketGenMode.LinearArrayBased) {
			this.tryMoveBucketLinearArrayBased(passed);
		}
	}

	public tryMoveBucketRandomBST = (passed: boolean) => {
		const newBucket = (this.currentNode.value as bucket);
		if (this.currentBucket != null) {
			this.currentBucket.passed = passed;
			AnalyticsEvents.sendBucket(this.currentBucket, passed);
		}
		console.log("new  bucket is " + newBucket.bucketID);
		AudioController.PreloadBucket(newBucket, this.app.GetDataURL());
		this.initBucket(newBucket);
	}

	public tryMoveBucketLinearArrayBased = (passed: boolean) => {
		const newBucket = this.buckets[this.currentLinearBucketIndex];
		// Avoid passing bucketPassed event to the analytics when we are in linear dev mode
		// if (this.currentBucket != null) {
		// 	this.currentBucket.passed = passed;
		// 	AnalyticsEvents.sendBucket(this.currentBucket, passed);
		// }
		console.log("New Bucket: " + newBucket.bucketID);
		AudioController.PreloadBucket(newBucket, this.app.GetDataURL());
		this.initBucket(newBucket);
	}

	public HasQuestionsLeft = () => {
		//// TODO: check buckets, check if done
		var hasQuestionsLeft = true;

		if (this.currentBucket.passed) return false;

		if (this.bucketGenMode === BucketGenMode.LinearArrayBased) {
			if (this.currentLinearBucketIndex >= this.buckets.length && this.currentLinearTargetIndex >= this.buckets[this.currentLinearBucketIndex].items.length) {
				// No more questions left
				return false;
			} else {
				return true;
			}
		}
			
		if (this.currentBucket.numCorrect >= 4) {
			//passed this bucket
			console.log("Passed this bucket " + this.currentBucket.bucketID);
			
			if (this.currentBucket.bucketID >= this.numBuckets) {
				//passed highest bucket
				console.log("Passed highest bucket");
				this.currentBucket.passed = true;
				if (this.bucketGenMode === BucketGenMode.RandomBST) {
					AnalyticsEvents.sendBucket(this.currentBucket, true);
				}
				UIController.ProgressChest();
				hasQuestionsLeft = false;
			}
			else {
				//moved up to next bucket
				console.log("Moving up bucket");
				if (this.currentNode.right != null){
					//move down to right
					UIController.ProgressChest();
					console.log("Moving to right node");
					if (this.bucketGenMode === BucketGenMode.RandomBST) {
						this.currentNode = this.currentNode.right;
					} else {
						this.currentLinearBucketIndex++;
					}
					this.tryMoveBucket(true);
				}else{
					// Reached root node
					console.log("Reached root node");
					this.currentBucket.passed = true;
					if (this.bucketGenMode === BucketGenMode.RandomBST) {
						AnalyticsEvents.sendBucket(this.currentBucket, true)
					}
					UIController.ProgressChest();
					hasQuestionsLeft = false;
				}
			}
		} else if (this.currentBucket.numConsecutiveWrong >= 2 || this.currentBucket.numTried >= 5) {
			// Failed this bucket
			console.log("Failed this bucket " + this.currentBucket.bucketID);
			if (this.currentBucket.bucketID < this.basalBucket) {
				// Update basal bucket number
				this.basalBucket = this.currentBucket.bucketID;
			}
			if (this.currentBucket.bucketID <= 1) {
				// Failed the lowest bucket
				console.log("Failed lowest bucket !");
				hasQuestionsLeft = false;
				this.currentBucket.passed = false;
				if (this.bucketGenMode === BucketGenMode.RandomBST) {
					AnalyticsEvents.sendBucket(this.currentBucket, false);
				}
			}
			else {
				console.log("Moving down bucket !");
				if (this.currentNode.left != null){
					// Move down to left
					console.log("Moving to left node");
					if (this.bucketGenMode === BucketGenMode.RandomBST) {
						this.currentNode = this.currentNode.left;
					} else {
						this.currentLinearBucketIndex++;
					}
					this.tryMoveBucket(false);
				} else {
					// Reached root node
					console.log("Reached root node !");
					hasQuestionsLeft = false;
					this.currentBucket.passed = false;
					if (this.bucketGenMode === BucketGenMode.RandomBST) {
						AnalyticsEvents.sendBucket(this.currentBucket, false);
					}
				}
			}
		}

		return hasQuestionsLeft;

	}
	
	public override onEnd(): void {
		AnalyticsEvents.sendFinished(this.buckets, this.basalBucket, this.ceilingBucket);
		UIController.ShowEnd();
		this.app.unityBridge.SendClose();
	}
}
