import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'lib-settings',
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.scss'],
    standalone: false
})
export class SettingsComponent implements OnInit {

  pageTitle = 'Settings';
  isDark = false;
  hideTags = false;
  transitions = true;
  isFilterAfterSave = false;
  betaFeatures = false;
  primaryColor: any;
  secondaryColor: any;

  constructor() {}

  ngOnInit(): void {
    this.isDark = localStorage.getItem('mode') === 'dark';
    this.hideTags = localStorage.getItem('hideTags') === 'yes';
    this.isFilterAfterSave = localStorage.getItem('filterAfterSave') === 'on';
    this.betaFeatures = localStorage.getItem('betaFeatures') === 'on';
    const transitions = localStorage.getItem('Transitions');
    this.transitions = transitions !== 'off';
    this.updateTransitions();
  }

  swap() {
    const mode = this.isDark ? 'dark' : 'light';
    localStorage.setItem('mode', mode);
    window.location.reload();
  }

  hide() {
    const mode = this.hideTags ? 'yes' : 'no';
    localStorage.setItem('hideTags', mode);
  }

  filterAfter() {
    const mode = this.isFilterAfterSave ? 'on' : 'off';
    localStorage.setItem('filterAfterSave', mode);
  }

  betaFeaturesChanged() {
    const mode = this.betaFeatures ? 'on' : 'off';
    localStorage.setItem('betaFeatures', mode);
  }

  transitionsChange() {
    const mode = this.transitions ? 'on' : 'off';
    localStorage.setItem('Transitions', mode);
    this.updateTransitions();
  }

  updateTransitions() {
    if (!this.transitions) {
      document.body.style.setProperty('--transition', '0s');
    } else {
      document.body.style.setProperty('--transition', '0.5s');
    }
  }

  onPrimaryColorChange(color: any) {
    localStorage.setItem('primaryColor', color);
    document.getElementsByTagName('html')[0].style.setProperty('--primary', color);
  }

  onSecondaryColorChange(color: any) {
    localStorage.setItem('secondaryColor', color);
    document.getElementsByTagName('html')[0].style.setProperty('--secondary', color);
  }
}
