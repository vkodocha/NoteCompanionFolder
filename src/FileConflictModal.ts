import { App, Modal, Setting } from "obsidian";

type ConflictResolution = "replace" | "rename" | "cancel";

export class FileConflictModal extends Modal {
  result: ConflictResolution = "cancel";

  constructor(
    app: App,
    private fileName: string,
    private onResult: (result: ConflictResolution) => void
  ) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl("h2", { text: "File already exists" });
    contentEl.createEl("p", {
      text: `The file "${this.fileName}" already exists. What do you want to do?`,
    });

    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText("Replace")
          .setWarning()
          .onClick(() => {
            this.result = "replace";
            this.close();
          })
      )
      .addButton((btn) =>
        btn
          .setButtonText("Rename")
          .onClick(() => {
            this.result = "rename";
            this.close();
          })
      )
      .addButton((btn) =>
        btn
          .setButtonText("Cancel")
          .setClass("mod-cta")
          .onClick(() => {
            this.result = "cancel";
            this.close();
          })
      );
  }

  onClose() {
    this.contentEl.empty();
    this.onResult(this.result);
  }

  /*static async handleConflict(app: App, fileName: string): Promise<ConflictResolution> {
    return new Promise((resolve) => {
      new FileConflictModal(app, fileName, resolve).open();
    });
  }*/
}