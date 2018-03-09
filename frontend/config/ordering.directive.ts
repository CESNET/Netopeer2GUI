import { Directive, ElementRef, HostListener, Input, AfterContentChecked } from '@angular/core';

import { ModificationsService } from './modifications.service';
import { SessionsService } from './sessions.service';
import { TreeService } from './tree.service';

@Directive( {
    selector: '[orderingLists]'
} )
export class OrderingDirective implements AfterContentChecked {
    private _draggingElement: HTMLElement;
    private _droppedElement: HTMLElement;
    private _dropSucceded: boolean;
    private _isInsideContainer: boolean;
    @Input() node;
    @Input() activeSession;

    constructor(private element: ElementRef,
                private modsService: ModificationsService,
                private sessionsService: SessionsService,
                private treeService: TreeService) { }

    ngAfterContentChecked() {
        this.markDraggable();
        //console.log(this.element)
    }

    @HostListener( 'dragstart', ['$event'] )
    dragStart( event ) {
        //console.log("dragStart");
        this.savePositions( 'dragIndex' );
        this._draggingElement = this.getDraggableElement( event );
        event.dataTransfer.setDragImage(this._draggingElement.firstElementChild, event.offsetX, event.offsetY);
        this._dropSucceded = false;
        this._isInsideContainer = true;

        /* Firefox hack */
        event.dataTransfer.setData('text', 'bad firefox');
    }

    @HostListener( 'dragend', ['$event'] )
    dragEnd( event: MouseEvent ) {
        //console.log("dragEnd");
        if ( !this._dropSucceded ) {
            this.cancelDragging();
        }
        event.preventDefault();
    }

    @HostListener( 'dragover', ['$event'] )
    dragOver( event: MouseEvent ) {
        //console.log("dragOver");
        // Required to receive "drop"" event
        event.preventDefault();
    }

    @HostListener( 'drag', ['$event'] )
    drag( event ) {
        //console.log("drag");
        // Check if mouse is outside container or not
        const divCoords = this.element.nativeElement.getBoundingClientRect();
        const inside = ( event.clientX >= divCoords.left && event.clientX <= divCoords.right && event.clientY >= divCoords.top && event.clientY <= divCoords.bottom );
        // Check if mouse mouves outisde container
        if ( this._isInsideContainer && !inside ) {
            this.cancelDragging();
        }

        this._isInsideContainer = inside;
    }

    @HostListener( 'dragenter', ['$event'] )
    dragEnter( event: MouseEvent ) {
        //console.log("dragEnter");
        const element: HTMLElement = this.getDraggableElement( event );
        if ( element && element.attributes ) {
            const draggingIndex = this._draggingElement.dataset['index'];
            const dropIndex = element.dataset['index'];

            if ( draggingIndex !== dropIndex ) {
                // Move dragging ghost element at its new position
                if ( draggingIndex > dropIndex ) {
                    this.element.nativeElement.insertBefore( this._draggingElement, element );
                } else {
                    this.element.nativeElement.insertBefore( this._draggingElement, element.nextSibling );
                }
                this.markDraggable();
            }
        }

        event.preventDefault();
    }

    @HostListener( 'drop', ['$event'] )
    drop( event: MouseEvent ) {
        //console.log("drop");
        this._dropSucceded = true;
        //console.log("moving " + this._draggingElement.dataset.dragIndex + " instead of " + this._draggingElement.dataset.index);
        let lastIndex = -1;
        let hasLast = false;
        let maintainLast = (this.node['info']['type'] == 16);
        let nodes = this.treeService.nodesToShow(this.activeSession, this.node);
        for ( let i = 0; i < this.element.nativeElement.childElementCount; i++ ) {
            let element = this.element.nativeElement.children[i];
            if (i == element.dataset.dragIndex) {
                /* no change */
                continue;
            }
            nodes[element.dataset.dragIndex]['order'] = i;
            if (maintainLast) {
                /* maintain last flag in lists, it is not important to maintain it in leaflist,
                 * since it is enough to have it just present in one of them */
                if ('last' in nodes[element.dataset.dragIndex]) {
                    hasLast = true;
                    delete nodes[element.dataset.dragIndex]['last'];
                } else if (i == this.element.nativeElement.childElementCount - 1) {
                    lastIndex = element.dataset.dragIndex;
                }
            }
        }
        if (hasLast) {
            nodes[lastIndex]['last'] = true;
        }

        let parent = this.treeService.nodeParent(this.activeSession, this.node);
        if (!('new' in parent)) {
            let path = this.treeService.pathCutPredicate(this.node['path'])
            let record = this.modsService.createModificationsRecord(this.activeSession, path);
            if (!('type' in record)) {
                /* new record */
                record['type'] = 'reorder';
                record['reorder'] = [];
                for (let i in nodes) {
                    record['reorder'].push(Number(i));
                }
            }
            let move = record['reorder'][this._draggingElement.dataset.dragIndex];
            record['reorder'].splice(this._draggingElement.dataset.dragIndex, 1);
            record['reorder'].splice(this._draggingElement.dataset.index, 0, move);

            //console.log(record['reorder']);

            let same = true;
            for (let item of nodes) {
                if (item['order'] != record['reorder'][item['order']]) {
                    same = false;
                    break;
                }
            }
            if (same) {
                this.modsService.removeModificationsRecord(this.activeSession, path);
            }
        }
        this.sessionsService.storeData();
        event.preventDefault();
    }

    private markDraggable() {
        for ( let i = 0; i < this.element.nativeElement.childElementCount; i++ ) {
            let element = this.element.nativeElement.children[i];
            element.draggable = true;
            element.dataset.index = i;
        }
    }

    private savePositions( attribute ) {
        for ( let i = 0; i < this.element.nativeElement.childElementCount; i++ ) {
            let element = this.element.nativeElement.children[i];
            element.dataset[attribute] = i;
        }
    }

    private getElementAt( attribute, index ) {
        for ( let i = 0; i < this.element.nativeElement.childElementCount; i++ ) {
            let element = this.element.nativeElement.children[i];
            if ( parseInt( element.dataset[attribute], 10 ) === index ) {
                return element;
            }
        }
        return null;
    }

    private cancelDragging() {
        let index = this.element.nativeElement.childElementCount - 1;
        // Get last element
        let beforeElement = this.getElementAt( 'dragIndex', index );

        while ( index > 0 ) {
            const element = this.getElementAt( 'dragIndex', index - 1 );
            this.element.nativeElement.insertBefore( element, beforeElement );

            beforeElement = element;
            index--;
        }
    }

    private getDraggableElement( event ): HTMLElement {
        let element: HTMLElement = <HTMLElement>event.target;
        while ( element && element.attributes && !element.attributes['draggable'] ) {
            element = <HTMLElement>element.parentNode;
        }
        return element;
    }
}
