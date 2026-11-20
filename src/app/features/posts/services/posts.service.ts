import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment.development';
import { Observable } from 'rxjs';
import {
  IsbookmarkResponse,
  IslikeResponse,
  PostlikesResponse,
  PostRequest,
  PostsResponse,
  SharepostRequest,
  SharepostResponse,
  SinglepostResponse,
} from '../models/posts.interface';

@Injectable({
  providedIn: 'root',
})
export class PostsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.baseUrl}/posts`;

  private createPostFormData(data: PostRequest): FormData {
    const formData = new FormData();

    if (data.body && data.body.trim() !== '') {
      formData.append('body', data.body);
    }

    if (data.image instanceof File) {
      formData.append('image', data.image);
    }

    return formData;
  }

  GetAllPosts(page: number = 1, limit: number = 10): Observable<PostsResponse> {
    const params: any = { page, limit };
    return this.http.get<PostsResponse>(`${this.apiUrl}`, { params });
  }

  GetHomeFeed(page: number = 1, limit: number = 10): Observable<PostsResponse> {
    const params: any = {
      only: 'following',
      page,
      limit,
    };
    return this.http.get<PostsResponse>(`${this.apiUrl}/feed`, { params });
  }

  CreatePost(data: PostRequest): Observable<SinglepostResponse> {
    const formData = this.createPostFormData(data);
    return this.http.post<SinglepostResponse>(`${this.apiUrl}`, formData);
  }

  GetSinglePost(id: string): Observable<SinglepostResponse> {
    return this.http.get<SinglepostResponse>(`${this.apiUrl}/${id}`);
  }

  GetPostLikes(id: string, page: number = 1, limit: number = 20): Observable<PostlikesResponse> {
    const params = { page, limit };
    return this.http.get<PostlikesResponse>(`${this.apiUrl}/${id}/likes`, { params });
  }

  UpdatePost(id: string, data: PostRequest): Observable<SinglepostResponse> {
    const formData = this.createPostFormData(data);
    return this.http.put<SinglepostResponse>(`${this.apiUrl}/${id}`, formData);
  }

  DeletePost(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  SharePost(data: SharepostRequest, id: string): Observable<SharepostResponse> {
    return this.http.post<SharepostResponse>(`${this.apiUrl}/${id}/share`, data);
  }

  TogglePostLike(id: string): Observable<IslikeResponse> {
    return this.http.put<IslikeResponse>(`${this.apiUrl}/${id}/like`, null);
  }

  TogglePostBookmark(id: string): Observable<IsbookmarkResponse> {
    return this.http.put<IsbookmarkResponse>(`${this.apiUrl}/${id}/bookmark`, null);
  }
}
