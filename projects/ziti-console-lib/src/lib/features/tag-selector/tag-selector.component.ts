import {AfterViewInit, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';

@Component({
    selector: 'lib-tag-selector',
    templateUrl: './tag-selector.component.html',
    styleUrls: ['./tag-selector.component.scss'],
    standalone: false
})
export class TagSelectorComponent implements AfterViewInit {
  _availableRoleAttributes: any[] = [];
  _availableNamedAttributes: any[] = [];

  @Input() placeholder = 'Select';
  @Input() disableField = false;
  @Input() disableCreate = false;
  @Input() hideOption = '';
  @Input() isLoading = false;
  @Input() errorMessage = '';
  @Input() focusOnInit = false;
  @Output() addRoleAttribute = new EventEmitter<any>();
  @Output() addNamedAttribute = new EventEmitter<any>();
  @Output() roleAttributeRemoved = new EventEmitter<any>();
  @Output() namedAttributeRemoved = new EventEmitter<any>();
  @Output() selectedRoleAttributesChange = new EventEmitter<any>();
  @Output() selectedNamedAttributesChange = new EventEmitter<any>();
  @Output() filterChange = new EventEmitter<any>();

  hideSelect = true;
  displayedRoleOptions: any[] = [];
  displayedNamedOptions: any[] = [];
  filterString = '';
  _hashAttributes = {};

  @ViewChild('search') search: ElementRef;
  @ViewChild('dropdownWrapper') dropdownWrapper: ElementRef;

  constructor() {
  }

  ngAfterViewInit() {
    if (this.focusOnInit) {
        this.search.nativeElement.focus();
    }
  }

  _selectedRoleAttributes: any[] = [];

  @Input() set selectedRoleAttributes(attrs: any) {
    if (attrs) {
      this._selectedRoleAttributes = attrs;
      this._filterAttributes();
    }
  }

  _selectedNamedAttributes: any[] = [];

  @Input() set selectedNamedAttributes(attrs: any) {
    if (attrs) {
      this._selectedNamedAttributes = attrs;
      this._filterAttributes();
    }
  }

  _hasError = false;

  @Input() set hasError(value: boolean) {
    this._hasError = value;
  }

  @Input() set availableRoleAttributes(attrs: any) {
    if (attrs) {
      this._availableRoleAttributes = attrs;
      this._filterAttributes();
    }
  }

  @Input() set availableNamedAttributes(attrs: any) {
    if (attrs) {
      this._availableNamedAttributes = attrs;
      this._filterAttributes();
    }
  }

  isSelected(item: any) {
    return this.isAttributeSelected(item);
  }

  addSelectedRoleAttribute(item: any) {
    if (!this.isAttributeSelected(item)) {
      this.addRoleAttribute.emit(item);
      this._selectedRoleAttributes.push(item);
      this.selectedRoleAttributesChange.emit(this._selectedRoleAttributes);
      this.hide();
    }
  }

  addSelectedNamedAttribute(item: any) {
    if (!this.isAttributeSelected(item)) {
      this.addNamedAttribute.emit(item);
      this._selectedNamedAttributes.push(item);
      this.selectedNamedAttributesChange.emit(this._selectedNamedAttributes);
      this.hide();
    }
  }

  isAttributeSelected(attribute) {
    if(!attribute || attribute.length <= 0) {
      return false;
    }
    if (attribute.charAt(0) === '#' || attribute.charAt(0) === '@') {
      attribute = attribute.substring(1);
    }
    let selected = false;
    this._selectedRoleAttributes.forEach((attr) => {
      if(attr === attribute) {
        selected = true;
      }
    });
    this._selectedNamedAttributes.forEach((attr) => {
      if(attr === attribute) {
        selected = true;
      }
    });
    return selected;
  }

  removeRoleAttribute(item: any) {
    if (!this.disableField) {
      this._selectedRoleAttributes = this._selectedRoleAttributes.filter((attr) => {
        return attr !== item;
      });
      this.selectedRoleAttributesChange.emit(this._selectedRoleAttributes);
      this.roleAttributeRemoved.emit(item);
      this.hide();
    }
  }

  removeNamedAttribute(item: any) {
    if (!this.disableField) {
      this._selectedNamedAttributes = this._selectedNamedAttributes.filter((attr) => {
        return attr !== item;
      });
      this.selectedNamedAttributesChange.emit(this._selectedNamedAttributes);
      this.namedAttributeRemoved.emit(item);
      this.hide();
    }
  }

  inputFocus() {
    this.hideSelect = false;
  }

  inputFocusOut() {
    this.hideSelect = true;
  }

  toggleSelect() {
    if (!this.disableField) {
      this.hideSelect = !this.hideSelect;
    }
  }

  openSelect() {
    if (!this.disableField) {
      this.hideSelect = false;
    }
  }

  hide() {
    this.hideSelect = true;
  }

  handleKeyUp($event: KeyboardEvent, filterString: string) {
    switch ($event.key) {
      case 'Enter':
        this.addNewAttribute(filterString);
        $event.stopPropagation();
        $event.preventDefault();
        break;
      case 'Escape':
        this.hide();
        this.search.nativeElement.blur();
        this.dropdownWrapper.nativeElement.focus();
        $event.stopPropagation();
        $event.preventDefault();
        break;
      default:
        this.applyFilter();
    }
    this.filterChange.emit(filterString);
  }

  handleKeyDown($event: KeyboardEvent) {
    switch ($event.key) {
      case 'Tab':
        this.toggleSelect();
        this.filterString = '';
        break;
      default:
    }
  }

  applyFilter = () => {
    this._hasError = false;
    this._filterAttributes();
  };

  // update the filter on mouse up event
  // this is used for the specific case where the user clears the filter via the x button
  applyFilterMouseUp() {
    setTimeout(() => {
      if (this.filterString === '') {
        this._filterAttributes();
      }
    }, 50);
  }

  _filterAttributes() {
    let filteredAvailableRoleAttributes: any[] = [];
    let filteredAvailableNamedAttributes: any[] = [];
    if (this.filterString) {
      filteredAvailableRoleAttributes = this._availableRoleAttributes.filter((attr) => {
        return attr.indexOf(this.filterString) >= 0
      });
      filteredAvailableNamedAttributes = this._availableNamedAttributes.filter((attr) => {
        return attr.indexOf(this.filterString) >= 0
      });
    } else {
      filteredAvailableRoleAttributes = this._availableRoleAttributes;
      filteredAvailableNamedAttributes = this._availableNamedAttributes;
    }

    this.displayedRoleOptions = filteredAvailableRoleAttributes;
    this.displayedNamedOptions = filteredAvailableNamedAttributes;
  }

  addNewAttribute(attribute: string) {
    if (!this.disableCreate) {
      this._hasError = false;
      if (attribute !== '') {
        let reference = attribute.charAt(0);

        if (reference === '#' || reference === '@') {
          attribute = attribute.substring(1);
        } else {
          reference = '#';
        }

        attribute = `${reference}${attribute}`;
        attribute = attribute.trim();

        if (!this.isAttributeSelected(attribute)) {
          attribute = attribute.substring(1);
          if (reference === '@') {
            this.addSelectedNamedAttribute(attribute);
            this.addRoleAttribute.emit(attribute);
          } else {
            this.addSelectedRoleAttribute(attribute);
            this.addNamedAttribute.emit(attribute);
          }
        } else {
          this.filterString = '';
          return;
        }
      }
      this.filterString = '';
      this.hide();
    }
  }

  get isNothingSelected() {
    return this._selectedRoleAttributes?.length <= 0 && this._selectedNamedAttributes?.length <= 0;
  }

  nameSort = (a: any, b: any) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
}
