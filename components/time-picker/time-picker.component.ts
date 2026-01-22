import {
  AfterViewInit,
  ApplicationRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ComponentFactoryResolver,
  ComponentRef,
  ElementRef,
  EmbeddedViewRef,
  EventEmitter,
  Injector,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  Renderer2,
  SimpleChanges,
  TemplateRef,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { isValid } from 'date-fns';
import { slideMotion } from './animations';
import { DecimalPipe, AsyncPipe, NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BooleanInput, ValueChangeAction, ValueChangeInvoker } from './types';
import { isNil } from './utils';
import { DateHelperByDatePipe } from './date-helper.service'
import { Observable, of, Subject } from 'rxjs';
import { NzTimePickerPanelComponent } from './time-picker-panel.component';
import { TimeHolder } from './time-holder';

@Component({
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nz-time-picker',
  exportAs: 'nzTimePicker',
  templateUrl: './time-picker.component.html',
  host: {
    '[class.ant-picker-large]': `nzSize === 'large'`,
    '[class.ant-picker-small]': `nzSize === 'small'`,
    '[class.ant-picker-disabled]': `nzDisabled`,
    '[class.ant-picker-focused]': `focused`,
    '[class.ant-picker-rtl]': `dir === 'rtl'`,
    '(click)': 'open()'
  },
  animations: [slideMotion],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: NzTimePickerComponent, multi: true }],
  styleUrls: ['./ng-zorro-antd.css'],
  imports: [DecimalPipe, AsyncPipe, NgIf, NgFor, FormsModule],
})
export class NzTimePickerComponent implements ControlValueAccessor, OnInit, AfterViewInit, OnChanges, OnDestroy {
  static ngAcceptInputType_nzUse12Hours: BooleanInput;
  static ngAcceptInputType_nzHideDisabledOptions: BooleanInput;
  static ngAcceptInputType_nzAllowEmpty: BooleanInput;
  static ngAcceptInputType_nzDisabled: BooleanInput;
  static ngAcceptInputType_nzAutoFocus: BooleanInput;
  static PANEL_HEIGHT = 303
  private _onChange?: (value: Date | null) => void;
  private _onTouched?: () => void;
  private destroy$ = new Subject<void>();
  isInit = false;
  focused = false;
  inputValue: string = '';
  value: Date | null = null;
  preValue: Date | null = null;
  inputSize?: number;
  i18nPlaceHolder$: Observable<string | undefined> = of(undefined);
  dir: string = 'ltr';

  @ViewChild('inputElement', { static: true }) inputRef!: ElementRef<HTMLInputElement>;
  @Input() nzId: string | null = null;
  @Input() nzSize: string | null = null;
  @Input() nzHourStep: number = 1;
  @Input() nzMinuteStep: number = 1;
  @Input() nzSecondStep: number = 1;
  @Input() nzClearText: string = 'clear';
  @Input() nzNowText: string = '';
  @Input() nzOkText: string = '';
  @Input() nzPopupClassName: string = '';
  @Input() nzPlaceHolder = '';
  @Input() nzAddOn?: TemplateRef<void>;
  @Input() nzDefaultOpenValue?: Date;
  @Input() nzDisabledHours?: () => number[];
  @Input() nzDisabledMinutes?: (hour: number) => number[];
  @Input() nzDisabledSeconds?: (hour: number, minute: number) => number[];
  @Input() nzFormat: string = 'HH:mm:ss';
  @Input() nzOpen = false;
  @Input() nzUse12Hours: boolean = false;
  @Input() nzHideDisabledOptions = false;
  @Input() nzAllowEmpty: boolean = true;
  @Input() nzDisabled = false;
  @Input() nzAutoFocus = false;
  @Input() nzSelectTextOnFocus = true;
  // lw inputs
  @Input() nzParentRef?: ElementRef
  @Input() bottomToTopDisabled = false

  @Output() readonly nzOpenChange = new EventEmitter<boolean>();
  @Output() ngBlur = new EventEmitter<void>();

  private onValueChange = new EventEmitter<ValueChangeAction>();

  private dropDown?: ComponentRef<NzTimePickerPanelComponent>

  emitValue(value: Date | null): void {
    this.setValue(value, true);

    if (this._onChange) {
      this._onChange(this.value);
    }

    if (this._onTouched) {
      this._onTouched();
    }
  }

  setValue(value: Date | null, syncPreValue: boolean = false): void {
    if (syncPreValue) {
      this.preValue = isValid(value) ? new Date(value!) : null;
    }
    this.value = isValid(value) ? new Date(value!) : null;
    this.inputValue = this.dateHelper.format(value, this.nzFormat);
    this.cdr.markForCheck();
  }

  private setupDropDownPosition(instance: any) {
    const inputRect = this.elementRef.nativeElement.getBoundingClientRect();

		if (this.bottomToTopDisabled || this.isTopToBottom(inputRect)) {
      instance.position = { top: inputRect.bottom, left: inputRect.left }
		} else {
      instance.position = { top: inputRect.top - NzTimePickerComponent.PANEL_HEIGHT, left: inputRect.left }
		}
  }

	isTopToBottom(rect: any) {
    const pannelHeight = NzTimePickerComponent.PANEL_HEIGHT
		const topSpace = rect.top
		const bottomY = rect.bottom + pannelHeight

		const fitVertically = window.innerHeight > bottomY
		if (!fitVertically) {
			// When not fit bottom and top in same time, show top to bottom (then user can scroll or see top half of option text)
			return topSpace < pannelHeight
		}

		return true
	}

  private setupDropdownInputs(instance: any) {
    instance.initValue = this.value
    instance.ngClass = this.nzPopupClassName
    instance.format = this.nzFormat
    instance.nzHourStep = this.nzHourStep
    instance.nzMinuteStep = this.nzMinuteStep
    instance.nzSecondStep = this.nzSecondStep
    instance.nzDisabledHours = this.nzDisabledHours
    instance.nzDisabledMinutes = this.nzDisabledMinutes
    instance.nzDisabledSeconds = this.nzDisabledSeconds
    instance.nzPlaceHolder = this.nzPlaceHolder
    instance.nzHideDisabledOptions = this.nzHideDisabledOptions
    instance.nzUse12Hours = this.nzUse12Hours
    instance.nzDefaultOpenValue = this.nzDefaultOpenValue
    instance.nzAddOn = this.nzAddOn
    instance.nzClearText = this.nzClearText
    instance.nzNowText = this.nzNowText
    instance.nzOkText = this.nzOkText
    instance.nzAllowEmpty = this.nzAllowEmpty
    instance.onValueChange = this.onValueChange
  }

  private initDropDownInstance(instance: any) {
    this.setupDropDownPosition(instance)
    this.setupDropdownInputs(instance)
    instance.closePanel.subscribe(($event: TimeHolder) => this.handleClosePanel($event))
  }

  private handleClosePanel($event: TimeHolder) {
    if ($event.value) {
      this.setValue($event.value);
    }
    this.setCurrentValueAndClose()
  }

  createDropDown() {
    const factory = this.componentFactoryResolver.resolveComponentFactory(NzTimePickerPanelComponent)
		this.dropDown = factory.create(this.injector)
    this.initDropDownInstance(this.dropDown.instance)
    this.appRef.attachView(this.dropDown.hostView)
		const hostComponent = (this.dropDown.hostView as EmbeddedViewRef<any>).rootNodes[0]
		document.body.append(hostComponent)
  }

  destroyDropDown() {
    if (!this.dropDown) {
			return
		}
		this.appRef.detachView(this.dropDown.hostView)
		this.dropDown.destroy()
		this.dropDown = undefined
  }

  open(): void {
    if (this.nzDisabled || this.nzOpen) {
      return;
    }
    this.focus();
    this.createDropDown()
    this.nzOpen = true;
    this.nzOpenChange.emit(this.nzOpen);
  }

  close(): void {
    this.nzOpen = false;
    this.destroyDropDown()
    this.cdr.markForCheck();
    this.nzOpenChange.emit(this.nzOpen);
  }

  updateAutoFocus(): void {
    if (this.isInit && !this.nzDisabled) {
      if (this.nzAutoFocus) {
        this.renderer.setAttribute(this.inputRef.nativeElement, 'autofocus', 'autofocus');
      } else {
        this.renderer.removeAttribute(this.inputRef.nativeElement, 'autofocus');
      }
    }
  }

  onClickClearBtn(event: MouseEvent): void {
    event.stopPropagation();
    this.emitValue(null);
  }

  onClickOutside(event: MouseEvent): void {
    if (!this.element.nativeElement.contains(event.target)) {
      this.setCurrentValueAndClose();
    }
  }

  onBlur() {
    this.onFocus(false)
    this.ngBlur.emit()
  }

  onFocus(value: boolean): void {
    this.focused = value;
    if (value && this.nzSelectTextOnFocus) {
      this.inputRef.nativeElement.setSelectionRange(0, this.inputRef.nativeElement.value.length)
    }
  }

  focus(): void {
    if (this.inputRef.nativeElement) {
      this.inputRef.nativeElement.focus();
    }
  }

  blur(): void {
    if (this.inputRef.nativeElement) {
      this.inputRef.nativeElement.blur();
    }
  }

  onKeyupEsc(): void {
    this.setValue(this.preValue);
  }

  onKeyupEnter(): void {
    if (this.nzOpen) {
      this.setCurrentValueAndClose();
    } else {
      this.open();
    }
  }

  onInputChange(str: string): void {
    if (document.activeElement === this.inputRef.nativeElement) {
      this.open();
      if (!str) {
        this.setValue(null)
      }
      this.parseTimeString(str);
    }
  }

  onPanelValueChange(value: Date): void {
    this.setValue(value);
    this.focus();
  }

  setCurrentValueAndClose(): void {
    this.emitValue(this.value);
    this.blur()
    this.close();
  }

  constructor(
    private element: ElementRef,
    private renderer: Renderer2,
    private cdr: ChangeDetectorRef,
    private dateHelper: DateHelperByDatePipe,
    private elementRef: ElementRef,
    private appRef: ApplicationRef,
		private componentFactoryResolver: ComponentFactoryResolver,
    private injector: Injector
  ) {
    // TODO: move to host after View Engine deprecation
    this.elementRef.nativeElement.classList.add('ant-picker');
  }

  private handlePanelChange(action: ValueChangeAction) {
    if (action.invoker === ValueChangeInvoker.FROM_PANEL) {
      this.onPanelValueChange(action.value)
    }
  }

  ngOnInit(): void {
    this.inputSize = Math.max(8, this.nzFormat.length) + 2;

    this.onValueChange.subscribe((action) => this.handlePanelChange(action))
  }

  ngOnDestroy(): void {
    this.destroyDropDown()
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const { nzUse12Hours, nzFormat, nzDisabled, nzAutoFocus } = changes;
    if (nzUse12Hours && !nzUse12Hours.previousValue && nzUse12Hours.currentValue && !nzFormat) {
      this.nzFormat = 'h:mm:ss a';
    }
    if (nzDisabled) {
      const value = nzDisabled.currentValue;
      const input = this.inputRef.nativeElement as HTMLInputElement;
      if (value) {
        this.renderer.setAttribute(input, 'disabled', '');
      } else {
        this.renderer.removeAttribute(input, 'disabled');
      }
    }
    if (nzAutoFocus) {
      this.updateAutoFocus();
    }
  }

  parseTimeString(str: string): void {
    const value = !str ? null : (this.dateHelper.parseTime(str, this.nzFormat) || null);
    if (isValid(value) || value === null) {
      this.value = value;
      if (str?.toUpperCase().includes('AM') && this.value?.getHours() === 12) {
        this.value.setHours(0)
      }
      // Report changes
      this.onValueChange.emit({invoker: ValueChangeInvoker.FROM_INPUT, value: value as Date})
      this.cdr.markForCheck();
    }
  }

  ngAfterViewInit(): void {
    this.isInit = true;
    this.updateAutoFocus();
  }

  writeValue(time: Date | null | undefined): void {
    let result: Date | null;

    if (time instanceof Date) {
      result = time;
    } else if (isNil(time)) {
      result = null;
    } else {
      console.warn('Non-Date type is not recommended for time-picker, use "Date" type.');
      result = new Date(time);
    }

    this.setValue(result, true);
  }

  registerOnChange(fn: (time: Date | null) => void): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.nzDisabled = isDisabled;
    this.cdr.markForCheck();
  }
}
