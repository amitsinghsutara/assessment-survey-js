//this is where the code will go for linearly iterating through the
//questions in a data.json file that identifies itself as a survey

import { UIController } from '../components/uiController';
import { AudioController } from '../components/audioController';
import { qData, answerData } from '../components/questionData';
import { AnalyticsEvents } from '../components/analyticsEvents'
import { App } from '../App';
import { BaseQuiz } from '../BaseQuiz';
import { fetchSurveyQuestions } from '../components/jsonUtils';
import { UnityBridge } from '../components/unityBridge';

export class Survey extends BaseQuiz {

	public questionsData: qData[];
	public currentQuestionIndex: number;

	constructor(dataURL: string, unityBridge) {
		super();
		console.log("Survey initialized");

		this.dataURL = dataURL;
		this.unityBridge = unityBridge;
		this.currentQuestionIndex = 0;
		UIController.SetButtonPressAction(this.TryAnswer);
		UIController.SetStartAction(this.startSurvey);
	}

	public handleBucketGenModeChange = () => {
		console.log("Bucket Gen Mode Changed");
	}

	public handleCorrectLabelShownChange = () => {
		console.log("Correct Label Shown Changed");
	}

	public async Run(app: App) {
		this.app = app;
		this.buildQuestionList().then(result => {
			this.questionsData = result;
			AudioController.PrepareAudioAndImagesForSurvey(this.questionsData, this.app.GetDataURL());
			this.unityBridge.SendLoaded();
		});
	}

	public startSurvey = () =>{
		UIController.ReadyForNext(this.getNextQuestion());
	}

	public onQuestionEnd = () => {
		UIController.SetFeedbackVisibile(false);

		this.currentQuestionIndex += 1;

		setTimeout(() => {
			if (this.HasQuestionsLeft()) {
				UIController.ReadyForNext(this.getNextQuestion());
			} else {
				console.log("There are no questions left.");
				this.onEnd();
			}
		}, 500);
	}

	public TryAnswer = (answer: number, elapsed: number) => {
		AnalyticsEvents.sendAnswered(this.questionsData[this.currentQuestionIndex], answer, elapsed)
		UIController.SetFeedbackVisibile(true);
		UIController.AddStar();
		setTimeout(() => { this.onQuestionEnd() }, 2000);
	}

	public buildQuestionList = () => {
		const surveyQuestions = fetchSurveyQuestions(this.app.dataURL);
		return surveyQuestions;
	}

	public HasQuestionsLeft(): boolean {
		return this.currentQuestionIndex <= (this.questionsData.length - 1);
	}

	public getNextQuestion(): qData {
		var questionData = this.questionsData[this.currentQuestionIndex];
		return questionData;
	}
}
