import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Root application component
 * Serves as the entry point for the entire application
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />'
})


export class AppComponent implements OnInit {
  ngOnInit() {
    const style = document.createElement('style');
    style.innerHTML = `
      .mat-mdc-option.mdc-list-item {
        background-color: #2a3347 !important;
      }
    `;
    document.head.appendChild(style);
  }
}