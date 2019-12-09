import Controls = require("VSS/Controls");
import TFSBuildContracts = require("TFS/Build/Contracts");
import TFSBuildExtensionContracts = require("TFS/Build/ExtensionContracts");
import DTClient = require("TFS/DistributedTask/TaskRestClient");

const BUILD_PHASE = "build";
const HTML_ATTACHMENT_TYPE = "HTML_ATTACHMENT_TYPE";
const JSON_ATTACHMENT_TYPE = "JSON_ATTACHMENT_TYPE";

export class SnykReportTab extends Controls.BaseControl {
	private projectId: string = "";
	private planId: string = "";
	private taskClient;
	private reportList: HTMLElement[] = [];

	constructor() {
		super();
	}

	public initialize = (): void => {
		super.initialize();
		// Get configuration that's shared between extension and the extension host
		const sharedConfig: TFSBuildExtensionContracts.IBuildResultsViewExtensionConfig = VSS.getConfiguration();
		const vsoContext = VSS.getWebContext();
		if(sharedConfig) {
			// register your extension with host through callback
			sharedConfig.onBuildChanged((build: TFSBuildContracts.Build) => {
				this.taskClient = DTClient.getClient();
				this.projectId = vsoContext.project.id;
				this.planId = build.orchestrationPlan.planId;

				const reportListElem: HTMLElement = (document.getElementById('reportList') as HTMLElement);
				
				this.taskClient.getPlanAttachments(
					this.projectId,
					BUILD_PHASE,
					this.planId,
					HTML_ATTACHMENT_TYPE
				)
				.then((taskAttachments) => {
					$.each(taskAttachments, (index, taskAttachment) => {
						const attachmentName = taskAttachment.name;
						const timelineId = taskAttachment.timelineId;
						const recordId = taskAttachment.recordId;

						if (taskAttachment._links && taskAttachment._links.self && taskAttachment._links.self.href) {
							const reportItem = this.createReportItem(
								index,
								attachmentName,
								timelineId,
								recordId
							);
							this.appendReportItem(reportListElem, reportItem);

							const jsonName = `${attachmentName.split(".")[0]}.json`;
							this.taskClient.getAttachmentContent(
								this.projectId,
								BUILD_PHASE,
								this.planId,
								timelineId,
								recordId,
								JSON_ATTACHMENT_TYPE,
								jsonName
							)
							.then((content) => {
								const json = JSON.parse(new TextDecoder("utf-8").decode((new DataView(content))));
								this.improveReportDisplayName(attachmentName, json, reportItem);
							});

							if (this.reportList.length == 1) this.reportList[0].click();
							VSS.notifyLoadSucceeded();
						}
					});
				});
			});
		}
	}

	private improveReportDisplayName = (attachmentName:string, json: string, reportItem: HTMLElement):void => {
		const img: HTMLImageElement = document.createElement("img");
		const span: HTMLElement = document.createElement("span");
		let spanText: string = "";

		if (json) {
			if (json["docker"] && json["docker"]["baseImage"])
				spanText = `Snyk Test for ${json["docker"]["baseImage"]} (${this.formatReportName(attachmentName)})`;

			if (json["packageManager"]) 
				spanText = `Snyk Test for ${json["packageManager"]} (${this.formatReportName(attachmentName)})`;

			if (json["vulnerabilities"] && json["vulnerabilities"].length > 0) {
				$(reportItem).addClass("failed");
				img.src = "../img/report-failed.png";
				spanText = `${spanText} | Found ${json["vulnerabilities"].length} issues`;
			}
			else {
				$(reportItem).addClass("passed");
				img.src = "../img/report-passed.png";
				spanText = `${spanText} | Not found issues`
			}
		}
		$(img).addClass("reportImg");
		$(span).text(spanText);
		reportItem.appendChild(img);
		reportItem.appendChild(span);
	}

	private createReportItem = (index: string | number | symbol, attachmentName:string, timelineId: string, recordId: string): HTMLElement => {
		const reportItem = document.createElement('li');
		$(reportItem).addClass("report");
		reportItem.onclick = (e) => this.showReport(index, attachmentName, timelineId, recordId);

		return reportItem;
	}

	private appendReportItem = (list: HTMLElement, item: HTMLElement): void => {
		this.reportList.push(item);
		list.appendChild(item);
	}

	private formatReportName = (name: string): string => {
		let reportName = name.split(".")[0];
		const tmpName = reportName.split("T");
		return  `${tmpName[0]} ${tmpName[1].replace(/-/g,":")}`;
	} 

	private showReport = (index: string | number | symbol, attachmentName: string, timelineId: string, recordId: string): void => {
		$.each(this.reportList, (index, reportItem) => $(reportItem).removeClass("currentReport"));
		$(this.reportList[index]).addClass("currentReport")
		const content: string = "<h3> Loading report... </h3>";
		this.fillReportIFrameContent(content);

		this.taskClient.getAttachmentContent(
			this.projectId,
			BUILD_PHASE,
			this.planId,
			timelineId,
			recordId,
			HTML_ATTACHMENT_TYPE,
			attachmentName
		)
		.then((content) => {
			const data = new TextDecoder("utf-8").decode((new DataView(content)));
			this.fillReportIFrameContent(data);
		});
	}

	private fillReportIFrameContent = (content: string): void => {
		const iframe: HTMLIFrameElement = (document.getElementById('iframeID') as HTMLIFrameElement);
			const iframeCW = iframe.contentWindow;

			if (iframeCW) {
				iframeCW.document.open();
				iframeCW.document.write(content);
				iframeCW.document.close();
			} else {
				console.log('iframeCW is null');
				console.log('iframe', iframe);
			}
	}
}

SnykReportTab.enhance(SnykReportTab, $("#snyk-report"), {});
