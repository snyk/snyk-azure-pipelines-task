import Controls = require("VSS/Controls");
import TFSBuildContracts = require("TFS/Build/Contracts");
import TFSBuildExtensionContracts = require("TFS/Build/ExtensionContracts");
import DTClient = require("TFS/DistributedTask/TaskRestClient");

const BUILD_PHASE = "build";
const FILE_TYPE_HTML = "HTML_ATTACHMENT_TYPE";

export class SnykReportTab extends Controls.BaseControl {
	constructor() {
		super();
	}

	public initialize(): void {
		super.initialize();
		// Get configuration that's shared between extension and the extension host
		const sharedConfig: TFSBuildExtensionContracts.IBuildResultsViewExtensionConfig = VSS.getConfiguration();
		const vsoContext = VSS.getWebContext();
		if(sharedConfig) {
			// register your extension with host through callback
			sharedConfig.onBuildChanged((build: TFSBuildContracts.Build) => {
				const taskClient = DTClient.getClient();
				taskClient.getPlanAttachments(
					vsoContext.project.id,
					BUILD_PHASE,
					build.orchestrationPlan.planId,
					FILE_TYPE_HTML
				)
				.then((taskAttachments) => {
					$.each(taskAttachments, (index, taskAttachment) => {
						if (taskAttachment._links && taskAttachment._links.self && taskAttachment._links.self.href) {
              const attachmentName = taskAttachment.name;
							const timelineId = taskAttachment.timelineId;
							const recordId = taskAttachment.recordId;

							taskClient.getAttachmentContent(
								vsoContext.project.id,
								BUILD_PHASE,
								build.orchestrationPlan.planId,
								timelineId,
								recordId,
								FILE_TYPE_HTML,
								attachmentName
							)
							.then((content) => {
								const data = new TextDecoder("utf-8").decode(new Uint16Array(content));
								const iframe: HTMLIFrameElement = (document.getElementById('iframeID') as HTMLIFrameElement);
								const iframeCW = iframe.contentWindow;

								if (iframeCW) {
									iframeCW.document.open();
									iframeCW.document.write(data);
									iframeCW.document.close();
								} else {
									console.log('iframeCW is null');
									console.log('iframe', iframe);
                }
                // Notify the parent frame that the host has been loaded
              VSS.notifyLoadSucceeded();  
							});
							VSS.notifyLoadSucceeded();
						}
					});
				});
			});
		}
	}
}

SnykReportTab.enhance(SnykReportTab, $("#snyk-report"), {});
