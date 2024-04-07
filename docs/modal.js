import {createComponent} from '../$.js'

createComponent(
  'etf-modal',
  `
    <style>
      * {
        margin: 0;
        padding: 0;
        opacity: 1;
        transition: 0.3s;
      }

      #bg {
        position: fixed;
        left: 0;
        top: 0;
        height: 100vh;
        width: 100vw;
        background: #000;
        opacity: 0.6;
        cursor: pointer;
      }

      #modal {
        z-index: 501;
      }

      .hidden, .hidden * {
        pointer-events: none;
        opacity: 0;
      }

      article {
        z-index: 500;
        display: flex;
        justify-content: center;
        align-items: center;
        position: absolute;
        height: 100vh;
        width: 100vw;
        top: 0;
        left: 0;

      }


    </style>


    <article id="modelParent" class="hidden">
      <div id="bg" ></div>
      <div id="modal" >
        <slot name="content"></slot>
      </div>
    </article>
  `,
  {display: false},
  (ctx) => {
    ctx.$bg = ctx.$('#bg')
    ctx.$modal = ctx.$('#modal')
    ctx.$modelParent = ctx.$('#modelParent')

    ctx.close = () => {
      ctx.setState({ display: false })
    }

    ctx.open = () => {
      ctx.setState({ display: true })
    }

    ctx.$bg.onclick = ctx.close


  },
  (ctx) => {
    const escClose = e => {
      if (e.key === 'Escape') ctx.close()
    }

    if (ctx.state.display) {
      ctx.$modelParent.classList.remove('hidden')
      document.addEventListener('keydown', escClose)
    } else {
      ctx.$modelParent.classList.add('hidden')
      document.removeEventListener('keydown', escClose)
    }

  },
)