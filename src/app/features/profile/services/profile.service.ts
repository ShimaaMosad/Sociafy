import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { UploadphotoRequest } from '../models/uploadphoto-request.interface';
import { UploadphotoResponse } from '../models/uploadphoto-response.interface';
import { MyprofileResponse } from '../models/myprofile-response.interface';
import { UserprofileResponse } from '../models/userprofile-response.interface';

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.baseUrl}/users`;

  private createphotoformData(data: UploadphotoRequest): FormData {
    const formData = new FormData();
    if (data.image) {
      formData.append('photo', data.image);
    }
    return formData;
  }

  uploadProfilePhoto(data: UploadphotoRequest): Observable<UploadphotoResponse> {
    const formData = this.createphotoformData(data);
    return this.http.put<UploadphotoResponse>(`${this.apiUrl}/upload-photo`, formData);
  }

  getMyProfile(): Observable<MyprofileResponse> {
    return this.http.get<MyprofileResponse>(`${this.apiUrl}/profile-data`);
  }

  getUserProfile(id: string): Observable<UserprofileResponse> {
    return this.http.get<UserprofileResponse>(`${this.apiUrl}/${id}/posts`);
  }

  getUserDetailsById(id: string): Observable<UserprofileResponse> {
    return this.http.get<UserprofileResponse>(`${this.apiUrl}/${id}/profile`);
  }
}
