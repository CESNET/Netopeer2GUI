/**
 * Author: Jakub Man <xmanja00@stud.fit.vutbr.cz>
 * Pipe implementing a sliding window for pagination
 */
import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
    name: 'pagination',
    pure: false
})
export class PaginationPipe implements PipeTransform{
    transform(items: any[], options: {page: number, perPage: number}): any {
        if(!items) return [];
        if(!options) return items;

        return items.slice((options.page - 1) * options.perPage, options.page * options.perPage);
    }
}
