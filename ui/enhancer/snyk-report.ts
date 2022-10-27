/*
 * Copyright 2022 Snyk Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as Controls from 'VSS/Controls';
import * as TFSBuildContracts from 'TFS/Build/Contracts';
import * as TFSBuildExtensionContracts from 'TFS/Build/ExtensionContracts';
import * as DTClient from 'TFS/DistributedTask/TaskRestClient';
import { generateReportTitle } from './generate-report-title';
import { detectVulns } from './detect-vulns';

const BUILD_PHASE = 'build';
const HTML_ATTACHMENT_TYPE = 'HTML_ATTACHMENT_TYPE';
const JSON_ATTACHMENT_TYPE = 'JSON_ATTACHMENT_TYPE';

export class SnykReportTab extends Controls.BaseControl {
  private projectId: string = '';
  private planId: string = '';
  private taskClient;
  private reportList: HTMLElement[] = [];

  constructor() {
    super();
  }

  public initialize = (): void => {
    super.initialize();
    // Get configuration that's shared between extension and the extension host
    const sharedConfig: TFSBuildExtensionContracts.IBuildResultsViewExtensionConfig =
      VSS.getConfiguration();
    const vsoContext = VSS.getWebContext();
    if (sharedConfig) {
      // register your extension with host through callback
      sharedConfig.onBuildChanged((build: TFSBuildContracts.Build) => {
        this.taskClient = DTClient.getClient();
        this.projectId = vsoContext.project.id;
        this.planId = build.orchestrationPlan.planId;

        const reportListElem: HTMLElement = document.getElementById(
          'reportList',
        ) as HTMLElement;

        this.taskClient
          .getPlanAttachments(
            this.projectId,
            BUILD_PHASE,
            this.planId,
            HTML_ATTACHMENT_TYPE,
          )
          .then((taskAttachments) => {
            $.each(taskAttachments, (index, taskAttachment) => {
              const attachmentName = taskAttachment.name;
              const timelineId = taskAttachment.timelineId;
              const recordId = taskAttachment.recordId;

              if (
                taskAttachment._links &&
                taskAttachment._links.self &&
                taskAttachment._links.self.href
              ) {
                const reportItem = this.createReportItem(
                  index,
                  attachmentName,
                  timelineId,
                  recordId,
                );
                this.appendReportItem(reportListElem, reportItem);

                const jsonName = `${attachmentName.split('.')[0]}.json`;
                this.taskClient
                  .getAttachmentContent(
                    this.projectId,
                    BUILD_PHASE,
                    this.planId,
                    timelineId,
                    recordId,
                    JSON_ATTACHMENT_TYPE,
                    jsonName,
                  )
                  .then((content) => {
                    const json = JSON.parse(
                      new TextDecoder('utf-8').decode(new DataView(content)),
                    );
                    this.improveReportDisplayName(
                      attachmentName,
                      json,
                      reportItem,
                    );
                  });

                if (this.reportList.length == 1) this.reportList[0].click();
                VSS.notifyLoadSucceeded();
              }
            });
          });
      });
    }
  };

  private improveReportDisplayName = (
    attachmentName: string,
    jsonResults: object | any[],
    reportItem: HTMLElement,
  ): void => {
    // TODO: should we fail in this case? Or is this a valid state?
    if (!jsonResults) {
      return;
    }

    const img: HTMLImageElement = document.createElement('img');
    const span: HTMLElement = document.createElement('span');
    const vulnsFound = detectVulns(jsonResults);
    const spanText = generateReportTitle(jsonResults, attachmentName);

    $(reportItem).addClass(vulnsFound ? 'failed' : 'passed');
    img.src = vulnsFound
      ? '../img/report-failed.png'
      : '../img/report-passed.png';
    $(img).addClass('reportImg');
    $(span).text(spanText);
    reportItem.appendChild(img);
    reportItem.appendChild(span);
  };

  private createReportItem = (
    index: string | number | symbol,
    attachmentName: string,
    timelineId: string,
    recordId: string,
  ): HTMLElement => {
    const reportItem = document.createElement('li');
    $(reportItem).addClass('report');
    reportItem.onclick = () =>
      this.showReport(index, attachmentName, timelineId, recordId);

    return reportItem;
  };

  private appendReportItem = (list: HTMLElement, item: HTMLElement): void => {
    this.reportList.push(item);
    list.appendChild(item);
  };

  private showReport = (
    index: string | number | symbol,
    attachmentName: string,
    timelineId: string,
    recordId: string,
  ): void => {
    $.each(this.reportList, (index, reportItem) =>
      $(reportItem).removeClass('currentReport'),
    );
    $(this.reportList[index]).addClass('currentReport');
    const content: string = '<h3> Loading report... </h3>';
    this.fillReportIFrameContent(content);

    this.taskClient
      .getAttachmentContent(
        this.projectId,
        BUILD_PHASE,
        this.planId,
        timelineId,
        recordId,
        HTML_ATTACHMENT_TYPE,
        attachmentName,
      )
      .then((content) => {
        const data = new TextDecoder('utf-8').decode(new DataView(content));
        this.fillReportIFrameContent(data);
      });
  };

  private fillReportIFrameContent = (content: string): void => {
    (document.getElementById('iframeID') as HTMLDivElement).innerHTML = content;
  };
}

SnykReportTab.enhance(SnykReportTab, $('#snyk-report'), {});
