export class GrowlerModel {
    public title: string;
    public subtitle: string;
    public level: string;
    public content: string;

    constructor(level = '', title = '', subtitle = '', content = '') {
        this.level = level;
        this.title = title;
        this.subtitle = subtitle;
        this.content = content;
    }
}
