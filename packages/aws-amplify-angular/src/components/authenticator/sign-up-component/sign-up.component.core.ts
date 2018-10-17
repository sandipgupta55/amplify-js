import { Component, Input, OnInit } from '@angular/core';
import { AmplifyService, AuthState } from '../../../providers';
import { countrylist, country }  from '../../../assets/countries';
import { stringType } from 'aws-sdk/clients/iam';


const template = `
<div class="amplify-container" *ngIf="_show">
  <div class="amplify-form-container">
    <div class="amplify-form-body">
      <div class="amplify-form-header">Create a new account</div>

      <div class="amplify-form-row" *ngFor="let field of signUpFields">
        <div *ngIf="field.key !== 'phone_number'">
          <label class="amplify-input-label">
            {{field.label}} 
            <span *ngIf="field.required">*</span>
          </label>
          <input #{{field.key}}
            class="amplify-form-input"
            type={{field.type}}
            placeholder={{field.label}}
            [(ngModel)]="user[field.key]" name="field.key" />
        </div>
        <div *ngIf="field.key === 'phone_number'">
          <label class="amplify-input-label">
            {{field.label}} 
            <span *ngIf="field.required">*</span>
          </label>
          
          <div class="amplify-input-group">
            <div class="amplify-input-group-item">
              <select #countryCode
                name="countryCode" 
                class="amplify-select-phone-country" 
                [value]="country_code">
                <option *ngFor="let country of countries"  
                  value={{country.value}}>{{country.label}} 
                </option>
              </select>
            </div>
            <div class="amplify-input-group-item">
              <input 
                class="amplify-form-input"
                placeholder={{field.label}}
                [(ngModel)]="local_phone_number"
                name="local_phone_number"
                type={{field.type}}
              />
            </div>
          </div>
        </div>
      </div>
      <div class="amplify-form-actions">
        
        <div class="amplify-form-cell-left">
          <div class="amplify-form-signup">
            Have an account? <a class="amplify-form-link" (click)="onSignIn()">Sign in</a>
          </div>
        </div>

        <div class="amplify-form-cell-right">
          <button class="amplify-form-button"
          (click)="onSignUp()"
          >Sign Up</button>
        </div>

      </div>

    </div>

  </div>

  <div class="amplify-alert" *ngIf="errorMessage">
    <div class="amplify-alert-body">
      <span class="amplify-alert-icon">&#9888;</span>
      <div class="amplify-alert-message">{{ errorMessage }}</div>
      <a class="amplify-alert-close" (click)="onAlertClose()">&times;</a>
    </div>
  </div>

</div>
`;


export class SignUpField{
  label: string;
  key: string;
  required?: boolean;
  type?: stringType;
  displayOrder?:number;
}

const defaultSignUpFields: SignUpField[] = [
  {
    label: 'Username',
    key: 'username',
    required: false,
    displayOrder: 1
  },
  {
    label: 'Password',
    key: 'password',
    required: true,
    type: 'password',
    displayOrder: 2,
  },
  {
    label: 'Email',
    key: 'email',
    required: true,
    type: 'string',
    displayOrder: 3
  },
  {
    label: 'Phone Number',
    key: 'phone_number',
    required: true,
    displayOrder: 4
  }
];

@Component({
  selector: 'amplify-auth-sign-up-core',
  template,
})

export class SignUpComponentCore implements OnInit {
  _authState: AuthState;
  _show: boolean;
  _signUpConfig: any;
  user: any = {};
  local_phone_number: string;
  country_code: string = '1';
  countries: country[];
  signUpFields: SignUpField[];
  errorMessage: string;
  amplifyService: AmplifyService;


  constructor(amplifyService: AmplifyService) {
    this.countries = countrylist;
    this.amplifyService = amplifyService;
  }

  ngOnInit() {
    this.sortFields();
  }

  @Input()
  set data(data: any) {
    this._authState = data.authState;
    this._show = data.authState.state === 'signUp';
    if (data.signUpConfig) {
      this._signUpConfig = data.signUpConfig;
      if (this._signUpConfig.defaultCountryCode) {
        this.country_code = this._signUpConfig.defaultCountryCode;
      }
      if (this._signUpConfig.signUpFields) {
        this.signUpFields = this._signUpConfig.signUpFields;
      }
    }
  }

  @Input()
  set authState(authState: AuthState) {
    this._authState = authState;
    this._show = authState.state === 'signUp';
  }

  @Input()
  set signUpConfig(signUpConfig: SignUpField[]) {
    this._signUpConfig = signUpConfig;
    if (this._signUpConfig.defaultCountryCode) {
      this.country_code = this._signUpConfig.defaultCountryCode;
    }
    if (this._signUpConfig.signUpFields) {
      this.signUpFields = this._signUpConfig.signUpFields;
    }
  }

  onSignUp() {

    this.user.attributes = {};
    this.user.phone_number = `+${this.country_code}${this.local_phone_number}`;
    const userKeys = Object.keys(this.user);
    const userValues = userKeys.map(key => this.user[key]);
    userKeys.forEach((key, index) => {
      if (key !== 'username' && key !== 'password' && key !== 'attributes') {
        this.user.attributes[key] = userValues[index];
      }
    });
    this.amplifyService.auth()
      .signUp(this.user)
      .then(user => this.amplifyService
        .setAuthState({ state: 'confirmSignUp', user: { 'username': this.user.username } }))
      .catch(err => this._setError(err));
  }

  onSignIn() {
    this.amplifyService.setAuthState({ state: 'signIn', user: null });
  }

  onConfirmSignUp() {
    this.amplifyService
      .setAuthState({ state: 'confirmSignUp', user: { 'username': this.user.username } });
  }

  sortFields() {
    if (this._signUpConfig &&
      this._signUpConfig.signUpFields &&
      this._signUpConfig.signUpFields.length > 0
    ) {

      if (!this._signUpConfig.hideDefaults) {
        // see if fields passed to component should override defaults
        defaultSignUpFields.forEach((f, i) => {
          const matchKey = this.signUpFields.findIndex((d) => {
            return d.key === f.key;
          });
          if (matchKey === -1) {
            this.signUpFields.push(f);
          }
        });
      }

      /* 
        sort fields based on following rules:
        1. Fields with displayOrder are sorted before those without displayOrder
        2. Fields with conflicting displayOrder are sorted alphabetically by key
        3. Fields without displayOrder are sorted alphabetically by key
      */
      this.signUpFields.sort((a, b) => {
        if (a.displayOrder && b.displayOrder) {
          if (a.displayOrder < b.displayOrder) {
            return -1;
          } else if (a.displayOrder > b.displayOrder) {
            return 1;
          } else {
            if (a.key < b.key) {
              return -1;
            } else {
              return 1;
            }
          }
        } else if (!a.displayOrder && b.displayOrder) {
          return 1;
        } else if (a.displayOrder && !b.displayOrder) {
          return -1;
        } else if (!a.displayOrder && !b.displayOrder) {
          if (a.key < b.key) {
            return -1;
          } else {
            return 1;
          }
        }
      });
    } else {
      this.signUpFields = defaultSignUpFields;
    }

  }

  onAlertClose() {
    this._setError(null);
  }

  _setError(err) {
    if (!err) {
      this.errorMessage = null;
      return;
    }

    this.errorMessage = err.message || err;
  }
}
