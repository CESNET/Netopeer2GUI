/***
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * A simple universal pagination
 *
 * Based on article by Ben Tedder
 * http://www.bentedder.com/create-a-pagination-component-in-angular-4/
 */
import { Component, Input, EventEmitter, Output } from '@angular/core';

@Component({
    selector: 'nc-pagination',
    templateUrl: './pagination.component.html',
    styleUrls: ['./pagination.component.scss']
})
export class PaginationComponent {

    @Input() page: number;
    @Input() itemCount: number;
    @Input() itemsPerPage: number;
    @Input() loading: boolean; // Is content loading?

    @Output() goPrev = new EventEmitter<boolean>();
    @Output() goNext = new EventEmitter<boolean>();
    @Output() goPage = new EventEmitter<number>();

    pagesToShow: number = 5;

    constructor() {
    }

    setPage(n: number): void {
        if(!this.loading) {
            if(n > 0 && n <= this.totalPages()) {
                this.goPage.emit(n);
            }
            else {
                this.page = 1;
            }
        }
    }

    nextPage(): void {
        if(this.page < this.totalPages()  && !this.loading) {
            this.goNext.emit(true);
        }

    }

    prevPage(): void {
        if(this.page > 1  && !this.loading) {
            this.goPrev.emit(true);
        }

    }

    totalPages(): number {
        return Math.ceil(this.itemCount / this.itemsPerPage) || 1;
    }

    isLastPage(): boolean {
        return this.itemsPerPage * this.page > this.itemCount;
    }

    getPages(): number[] {
        const p = this.page || 1;
        const pages = this.pagesToShow || 10;
        let nums: number[] = [];
        if(p < Math.ceil(pages / 2) + 2) {
            for(let i = 2; i <= pages + 1; i++) {
                if(i >= this.totalPages()) {
                    break;
                }
                if(i < 2) {
                    continue;
                }
                nums.push(i);
            }
        }
        else if(p > (this.totalPages() - Math.ceil(pages / 2))) {
            for(let i = this.totalPages() - pages; i < this.totalPages(); i++) {
                if(i < 2) {
                    continue;
                }
                nums.push(i);
            }
        }
        else {
            for(let i = Math.ceil(p - (pages / 2)); i < Math.ceil(p + (pages / 2)); i++) {
                if(i >= this.totalPages()) {
                    break;
                }
                if(i < 2) {
                    continue;
                }
                nums.push(i);
            }
        }

        return nums;
    }

}
